// app/api/amplify-health/route.ts
import { NextResponse } from 'next/server';
import '@/app/amplify-init-server';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/schema';

export async function GET() {
  const cfg: any = (Amplify as any).getConfig?.() || {};
  const endpoint = cfg?.API?.GraphQL?.endpoint ?? null;
  const region   = cfg?.Auth?.Cognito?.region ?? null;

  try {
    const c: any = generateClient<Schema>({ authMode: 'userPool' });
    const modelNames = Object.keys(c?.models || {});
    return NextResponse.json({ ok: true, endpoint, region, modelNames });
  } catch (e:any) {
    return NextResponse.json({ ok: false, endpoint, region, error: e?.message || String(e) }, { status: 500 });
  }
}
