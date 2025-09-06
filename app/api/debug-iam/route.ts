//app/api/debug-iam/route.ts
import { NextResponse } from 'next/server';
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
import { STSClient, GetCallerIdentityCommand } from "@aws-sdk/client-sts";

export async function GET() {
  try {
    const credentialsProvider = fromNodeProviderChain();
    const creds = await credentialsProvider();

    const stsClient = new STSClient({ credentials: creds });
    const identity = await stsClient.send(new GetCallerIdentityCommand({}));
    

    return NextResponse.json({
      success: true,
      identity,
      credentialsSummary: {
        accessKeyId: creds.accessKeyId,
        sessionToken: creds.sessionToken ? '✔️ present' : '❌ missing',
      },
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message,
      stack: err.stack,
    }, { status: 500 });
  }
}
