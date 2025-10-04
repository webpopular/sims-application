import { NextResponse } from "next/server";
import {
    CognitoIdentityProviderClient,
    InitiateAuthCommand,
} from "@aws-sdk/client-cognito-identity-provider";

// --- Cognito service user auth ---
async function getServiceUserToken() {
    const client = new CognitoIdentityProviderClient({
        region: process.env.AWS_REGION,
    });

    const command = new InitiateAuthCommand({
        AuthFlow: "USER_PASSWORD_AUTH",
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

// --- GraphQL mutation ---
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

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const row = body.row ?? body;

        const sheetName: string | undefined = body?.sheet?.name ?? body?.sheetName;

        let division: string | null = null;
        let submissionType: string | null = null;

        if (sheetName) {
            // Example: "Deltar (NA) Injury Report"
            const match = sheetName.match(/^(.*?)\s*\((.*?)\)\s*(.*?)$/);
            if (match) {
                division = match[1]?.trim() ?? null;           // "Deltar"
                const region = match[2]?.trim() ?? null;       // "NA"
                submissionType = match[3]?.replace(/Report/i, "").trim() ?? null; // "Injury"
                if (region) division = `${division} (${region})`;
            } else {
                // fallback if pattern doesn’t match — e.g. “Shakeproof Observation Report”
                const parts = sheetName.split(" ");
                submissionType = parts.pop()?.replace(/Report/i, "").trim() ?? null;
                division = parts.join(" ").trim();
            }
        }
        console.log("Detected division:", division, "submissionType:", submissionType);

        if (!row?.cells) {
            return NextResponse.json(
                { status: "error", message: "Invalid Smartsheet payload" },
                { status: 400 }
            );
        }

        // Flatten Smartsheet cells
        const mapped: Record<string, any> = {};
        for (const [colName, cell] of Object.entries(row.cells)) {
            mapped[colName] =
                (cell as any).value ?? (cell as any).displayValue ?? null;
        }

        // Build input object (required + schema aligned)
        // --- Build input object aligned to schema ---
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

// Branch based on submission type
        switch (input.submissionType) {
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

            default:
                console.warn("Unknown Submission Type:", input.submissionType);
                break;
        }

        console.log("Final CreateSubmissionInput:", input);


        console.log("Final CreateSubmissionInput:", input);

        // 🔑 Get Cognito token
        const token = await getServiceUserToken();

        // --- Direct AppSync call ---
        const response = await fetch(process.env.APPSYNC_API_URL!, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: token, // <- Use IdToken here
            },
            body: JSON.stringify({
                query: mutation,
                variables: { input },
            }),
        });

        const result = await response.json();
        console.log("AppSync raw result:", result);

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
        console.error("Smartsheet intake error:", err);
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
