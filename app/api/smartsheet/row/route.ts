import { NextResponse } from 'next/server';
import {
    CognitoIdentityProviderClient,
    InitiateAuthCommand,
} from '@aws-sdk/client-cognito-identity-provider';

async function getServiceUserToken() {
    const client = new CognitoIdentityProviderClient({
        region: process.env.AWS_REGION,
    });

    const command = new InitiateAuthCommand({
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: process.env.COGNITO_CLIENT_ID!,
        AuthParameters: {
            USERNAME: process.env.COGNITO_USERNAME!,
            PASSWORD: process.env.COGNITO_PASSWORD!,
        },
    });

    const response = await client.send(command);
    const token = response.AuthenticationResult?.IdToken;
    if (!token) throw new Error("No AuthenticationResult in response");
    return token;
}

// --- Helper: normalize division (e.g., "Deltar (NA)" -> "Deltar NA") ---
function normalizeDivision(mapped: Record<string, any>): string | null {
    const divisionRaw = mapped["Division"] ?? null;
    if (!divisionRaw) return null;

    const match = divisionRaw.match(/^(.+?)(?:\s*\(([^)]+)\))?$/);
    if (match) {
        const division = match[1].trim();
        const region = match[2]?.trim();
        // Combine with space, e.g. "Deltar (NA)" → "Deltar NA"
        return region ? `${division} ${region}` : division;
    }

    return divisionRaw.trim();
}

const mutation = /* GraphQL */ `
  mutation CreateSubmission($input: CreateSubmissionInput!) {
    createSubmission(input: $input) {
      id
      submissionId
      status
      location
      submissionType
      createdAt
    }
  }
`;

// --- Normalize Smartsheet intake to match existing app data ---
function normalizeSubmissionForApp(input: Record<string, any>): Record<string, any> {
    // Convert "Injury", "Observation", "Recognition" into "Direct"
    input.submissionType = "Direct";

    // Normalize division to empty string instead of null
    if (!input.division) input.division = "";

    // Map location -> locationOnSite
    input.locationOnSite = input.location ?? "TBD";
    input.location = "TBD"; // App always stores generic TBD here

    // Use incident description or observation note as title
    input.title =
        input.incidentDescription ??
        input.obsTypeOfConcern ??
        input.recognitionNotes ??
        "Smartsheet Submission";

    // Standardize status
    if (input.title?.toLowerCase().includes("obs")) {
        input.status = "Observation with RCA - Open";
    } else {
        input.status = "Incident with RCA - Open";
    }

    // Generate a submissionId consistent with app pattern if missing
    if (!input.submissionId || !input.submissionId.includes("-")) {
        const now = new Date();
        const stamp = now.toISOString().slice(2, 10).replace(/-/g, "");
        input.submissionId = `GL-I-${stamp}-${now.getHours()}${now.getMinutes()}`;
    }

    return input;
}


export async function POST(req: Request) {
    try {
        const body = await req.json();
        const row = body.row ?? body;
        const sheetName: string | undefined = body?.sheet?.name ?? body?.sheetName;

        if (!row?.cells)
            return NextResponse.json(
                { status: "error", message: "Invalid Smartsheet payload" },
                { status: 400 }
            );

        // Flatten cells
        const mapped: Record<string, any> = {};
        for (const [colName, cell] of Object.entries(row.cells)) {
            mapped[colName] =
                (cell as any).value ?? (cell as any).displayValue ?? null;
        }

        // Derive division & submission type
        const submissionType =
            mapped["Submission Type"] ??
            sheetName?.match(/\b(Injury|Observation|Recognition)\b/i)?.[1] ??
            null;

        const division = normalizeDivision(mapped);

        if (!submissionType || !division) {
            console.warn("⚠️ Missing required division or submissionType");
            return NextResponse.json(
                {
                    status: "skipped",
                    message: "Missing division or submissionType — not submitted",
                },
                { status: 200 }
            );
        }

        console.log("✅ Normalized division:", division);

        let input: Record<string, any> = {
            submissionId: mapped["Auto Number"]?.toString() ?? crypto.randomUUID(),
            recordType: mapped["Record Type"] ?? "General",
            status: "New",
            location: mapped["LOCATION"] ?? "Unknown",
            submissionType,
            division,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        const smartsheetDate = mapped["Date of Incident"]; // e.g. "2025-10-06"
        if (smartsheetDate) {
            // store as YYYY-MM-DD (what the schema expects as a string)
            input.dateOfIncident = new Date(smartsheetDate).toISOString().slice(0, 10);
        }

        input = normalizeSubmissionForApp(input);

        // Attach extra fields based on submission type
        switch (submissionType) {
            case "Injury":
                Object.assign(input, {
                    incidentDescription: mapped["Incident Description"] ?? null,
                    injuryDescription: mapped["Injury Description"] ?? null,
                    incidentCategory: mapped["Incident Category/Type"] ?? null,
                    injuryCategory: mapped["Injury Category"] ?? null,
                    injuredBodyPart: mapped["Body Part Injured"]
                        ? [mapped["Body Part Injured"]]
                        : null,
                    injuryType: mapped["Injury Type"] ? [mapped["Injury Type"]] : null,
                    isCovidRelated: mapped["COVID-19"] ?? null,
                    investigationStatus: "Pending",
                    employeeId: mapped["Employee ID"]?.toString() ?? null,
                    firstName: mapped["First Name"] ?? null,
                    lastName: mapped["Last Name"] ?? null,
                    dateOfBirth: mapped["Date of Birth"] ?? null,
                    dateHired: mapped["Date Hired"] ?? null,
                    sex: mapped["Sex"] ?? null,
                    employeeType: mapped["Employee Type"] ?? null,
                    workActivityCategory: mapped["Work Area/Activity Category"] ?? null,
                });
                break;

            case "Observation":
                Object.assign(input, {
                    obsTypeOfConcern: mapped["Observation Type of Concern"] ?? null,
                    obsPriorityType: mapped["Observation Priority"] ?? null,
                    obsCorrectiveAction: mapped["Observation Corrective Action"] ?? null,
                });
                break;

            case "Recognition":
                Object.assign(input, {
                    recognitionType: mapped["Recognition Type"] ?? null,
                    recognizedEmployee: mapped["Recognized Employee"] ?? null,
                    recognitionNotes: mapped["Recognition Notes"] ?? null,
                });
                break;
        }

        console.log("📦 Final CreateSubmissionInput:", input);

        // --- Authenticate + call AppSync ---
        const token = await getServiceUserToken();

        const response = await fetch(process.env.APPSYNC_API_URL!, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: token,
            },
            body: JSON.stringify({
                query: mutation,
                variables: { input },
            }),
        });

        const result = await response.json();
        console.log("📡 AppSync raw result:", result);

        if (result.data?.createSubmission) {
            return NextResponse.json({
                status: "ok",
                id: result.data.createSubmission.id,
            });
        }

        return NextResponse.json(
            { status: "error", errors: result.errors ?? "Unknown error" },
            { status: 400 }
        );
    } catch (err: any) {
        console.error("❌ Smartsheet intake error:", err);
        return NextResponse.json(
            {
                status: "error",
                error: err.message ?? "Unknown error",
                details: err.stack ?? err,
            },
            { status: 500 }
        );
    }
}
