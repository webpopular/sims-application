import { NextResponse } from 'next/server';

export async function GET() {
    const required = {
        AWS_REGION: !!process.env.AWS_REGION,
        COGNITO_USER_POOL_ID: !!process.env.COGNITO_USER_POOL_ID,
        COGNITO_USER_POOL_CLIENT_ID: !!process.env.COGNITO_USER_POOL_CLIENT_ID,
        APPSYNC_API_URL: !!process.env.APPSYNC_API_URL,
        // client-exposed (browser) vars DO NOT help the server:
        NEXT_PUBLIC_AWS_REGION: !!process.env.NEXT_PUBLIC_AWS_REGION,
        NEXT_PUBLIC_COGNITO_USER_POOL_ID: !!process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID,
        NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID: !!process.env.NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID,
        NEXT_PUBLIC_APPSYNC_API_URL: !!process.env.NEXT_PUBLIC_APPSYNC_API_URL,
    };
    return NextResponse.json({ required });
}
