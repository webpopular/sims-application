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
        const input: Record<string, any> = {
            submissionId: mapped["Auto Number"]?.toString() ?? crypto.randomUUID(),
            recordType: "Injury",
            status: "New",
            location: mapped["LOCATION"] ?? "Unknown",
            submissionType: mapped["Submission Type"] ?? "Injury",
            incidentDescription: mapped["Incident Description"] ?? null,
            injuryDescription: mapped["Injury Description"] ?? null,
            investigationStatus: "Pending",
            isCovidRelated: mapped["COVID-19"] ?? null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

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
