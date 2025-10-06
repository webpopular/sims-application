export async function GET() {
    // List all relevant env vars you want to confirm
    const envVars = {
        NODE_ENV: process.env.NODE_ENV,
        AWS_REGION: process.env.AWS_REGION,
        MY_AWS_REGION: process.env.MY_AWS_REGION,
        COGNITO_CLIENT_ID: process.env.COGNITO_CLIENT_ID,
        COGNITO_USERNAME: process.env.COGNITO_USERNAME,
        COGNITO_PASSWORD: process.env.COGNITO_PASSWORD ? "✅ (set)" : "❌ (missing)",
        APPSYNC_API_URL: process.env.APPSYNC_API_URL,
        NEXT_PUBLIC_CLIENT_ID: process.env.NEXT_PUBLIC_CLIENT_ID,
        CLIENT_ID: process.env.CLIENT_ID,
    };

    return Response.json(envVars, { status: 200 });
}
