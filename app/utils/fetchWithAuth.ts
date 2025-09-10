import { fetchAuthSession } from 'aws-amplify/auth';

export async function fetchWithAuth(input: RequestInfo | URL, init: RequestInit = {}) {
    const s = await fetchAuthSession({ forceRefresh: true });
    const id = s.tokens?.idToken?.toString();
    if (!id) throw new Error('Not signed in');

    const headers = new Headers(init.headers as any);
    headers.set('Authorization', `Bearer ${id}`);
    return fetch(input, { ...init, headers });
}
