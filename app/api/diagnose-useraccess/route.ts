// app/api/diagnose-useraccess/route.ts

import { NextResponse } from 'next/server';

// Env-driven Amplify init (no outputs.json)
import '@/app/amplify-init';

import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/schema';
import { fetchAuthSession } from 'aws-amplify/auth/server';

// Enable SSR cookies
Amplify.configure({}, { ssr: true });

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Safe helpers
function safeModelNames(c: any): string[] {
    try {
        const m = c?.models;
        return m && typeof m === 'object' ? Object.keys(m) : [];
    } catch {
        return [];
    }
}
function pickModelName(names: string[]): string {
    if (names.includes('UserRole')) return 'UserRole';
    if (names.includes('UserAccess')) return 'UserAccess';
    if (names.includes('User')) return 'User';
    if (names.includes('Users')) return 'Users';
    return names[0] || '';
}

export async function GET(req: Request) {
    const url = new URL(req.url);
    const emailParam = url.searchParams.get('email') || '';

    try {
        const session = await fetchAuthSession();
        const idToken = session.tokens?.idToken?.toString();
        const loginId =
            (session as any)?.tokens?.idToken?.payload?.email ||
            (session as any)?.tokens?.idToken?.payload?.['cognito:username'] ||
            '';

        const effectiveEmail = (emailParam || loginId || '').trim().toLowerCase();

        // Peek at config safely
        let amplifyCfg: any = {};
        try {
            amplifyCfg = (Amplify as any).getConfig?.() || {};
        } catch {
            amplifyCfg = {};
        }

        const endpoint = amplifyCfg?.API?.GraphQL?.endpoint ?? process.env.NEXT_PUBLIC_APPSYNC_API_URL ?? process.env.APPSYNC_API_URL ?? null;
        const region   = amplifyCfg?.Auth?.Cognito?.region ?? process.env.AWS_REGION ?? process.env.NEXT_PUBLIC_AWS_REGION ?? null;
        const userPoolId = amplifyCfg?.Auth?.Cognito?.userPoolId ?? process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID ?? null;

        // Build both clients to compare auth
        const userPoolClient = generateClient<Schema>({ authMode: 'userPool' });
        const iamClient      = generateClient<Schema>({ authMode: 'iam' });

        const userPoolModels = safeModelNames(userPoolClient as any);
        const iamModels      = safeModelNames(iamClient as any);

        const modelName = pickModelName(userPoolModels.length ? userPoolModels : iamModels);

        const selectionSet = [
            'email','name','roleTitle',
            'enterprise','segment','platform','division','plant',
            'hierarchyString','level','isActive','accessScope',
        ] as const;

        async function tryList(c: any) {
            const out: { ok: boolean; error?: string; dataCount?: number; sample?: any; graphQLErrors?: any } = { ok: false };
            try {
                const model = c?.models?.[modelName];
                if (!model) {
                    out.error = `Model '${modelName}' not found in client`;
                    return out;
                }
                const res = await model.list({
                    filter: effectiveEmail ? { email: { eq: effectiveEmail } } : undefined,
                    selectionSet,
                    limit: 3,
                });
                out.ok = true;
                out.dataCount = res?.data?.length ?? 0;
                out.sample = res?.data?.slice?.(0, 3) ?? null;
                out.graphQLErrors = res?.errors ?? null;
                return out;
            } catch (e: any) {
                out.error = e?.message || String(e);
                return out;
            }
        }

        const userPoolRead = await tryList(userPoolClient as any);
        const iamRead      = await tryList(iamClient as any);

        return NextResponse.json({
            ok: true,
            using: { endpoint, region, userPoolId },
            session: {
                hasIdToken: !!idToken,
                loginId,
                groups: (session as any)?.tokens?.idToken?.payload?.['cognito:groups'] || [],
            },
            models: { userPool: userPoolModels, iam: iamModels, chosen: modelName },
            query: { emailParam, effectiveEmail },
            results: {
                userPool: userPoolRead,
                iam: iamRead,
            },
            notes: [
                'If IAM returns data but userPool does not, your GraphQL @auth rules block signed-in users.',
                'If both return 0 and you expect rows, the endpoint/env likely points to a different API.',
                'If model lists are empty, Amplify wasn’t configured for the server; check your universal init.',
            ],
        });
    } catch (err: any) {
        return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
    }
}
