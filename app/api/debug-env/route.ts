import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    region: process.env.AWS_REGION,
    pool: process.env.COGNITO_USER_POOL_ID,
    nextPublicPool: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID,
  });
}
