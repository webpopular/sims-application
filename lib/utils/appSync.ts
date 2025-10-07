// lib/appsync.ts
import { fetchAuthSession, getCurrentUser } from 'aws-amplify/auth';

export async function getIdTokenOrThrow() {
    try {
        const s = await fetchAuthSession({ forceRefresh: true }); // refreshes if needed
        const id = s.tokens?.idToken?.toString();
        if (!id) throw new Error('NO_ID_TOKEN');
        return { idToken: id, payload: s.tokens!.idToken!.payload as Record<string, any> };
    } catch (e) {
        // Session is bad / refresh failed — caller should sign the user out
        const err = e as Error;
        err.name = 'AUTH_RENEWAL_FAILED';
        throw err;
    }
}

type AppSyncEnvelope<T> = { data: T; errors?: Array<{ message: string }> };

export async function callAppSync<T = any>(query: string, variables?: any): Promise<AppSyncEnvelope<T>> {
    const { idToken } = await getIdTokenOrThrow();
    const r = await fetch(process.env.NEXT_PUBLIC_APPSYNC_API_URL!, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            Authorization: idToken, // RAW ID token (no "Bearer ")
        },
        body: JSON.stringify({ query, variables }),
    });
    const text = await r.text();
    if (!r.ok) throw new Error(`AppSync ${r.status}: ${text}`);
    return JSON.parse(text);
}
