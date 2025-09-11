'use client';
import { Amplify } from 'aws-amplify';
import {fetchAuthSession, fetchUserAttributes, getCurrentUser} from "aws-amplify/auth";
import amplifyConfig from "@/app/amplify-config";

let configured = false;

export function initAmplify() {
    if (configured) return;
    Amplify.configure(amplifyConfig);
    configured = true;

    // async function probe() {
    //     try {
    //         const me = await getCurrentUser(); // proves you’re signed in
    //         console.log('[me]', me);
    //
    //         const session = await fetchAuthSession({ forceRefresh: true });
    //         console.log('[idToken payload]', session.tokens?.idToken?.payload);
    //         console.log('[accessToken payload]', session.tokens?.accessToken?.payload);
    //         // aud should equal your userPoolClientId
    //         const payload = session.tokens?.idToken?.payload as any;
    //         console.log('token_use:', payload?.token_use);      // must be "id"
    //         console.log('iss:', payload?.iss);                  // ends with .../us-east-1_Z3CG7fZZP
    //         console.log('aud:', payload?.aud);                  // 6ms10kvvnstm99lvk5jua9j6lt
    //         console.log('exp > now?', (payload?.exp ?? 0) * 1000 > Date.now());
    //
    //         const attrs = await fetchUserAttributes();
    //         console.log('[attributes]', attrs);
    //     } catch (e) {
    //         console.error('[auth probe error]', e);
    //     }
    // }
    // probe();
}
