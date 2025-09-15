// lib/appsync.ts
import { fetchAuthSession, getCurrentUser } from 'aws-amplify/auth';

export async function getIdTokenOrThrow() {
    await getCurrentUser().catch(() => { throw new Error('Not signed in'); });

    const s = await fetchAuthSession({ forceRefresh: true });
    const id = s.tokens?.idToken?.toString();
    if (!id) throw new Error('No ID token yet');

    return { idToken: id, payload: s.tokens!.idToken!.payload as Record<string, any> };
}

type AppSyncEnvelope<T> = { data: T; errors?: Array<{ message: string }> };

export async function callAppSync<T = any>(query: string, variables?: any): Promise<AppSyncEnvelope<T>> {
    const { idToken } = await getIdTokenOrThrow();

    const r = await fetch(process.env.NEXT_PUBLIC_APPSYNC_API_URL!, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            Authorization: idToken, // raw JWT (Cognito User Pool auth)
        },
        body: JSON.stringify({ query, variables }),
    });

    const text = await r.text();
    if (!r.ok) throw new Error(`AppSync ${r.status}: ${text}`);
    return JSON.parse(text);
}
