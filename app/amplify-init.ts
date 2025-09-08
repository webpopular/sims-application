// app/amplify-init.ts
'use client';
import { Amplify } from 'aws-amplify';
import { amplifyConfig } from '@/app/amplify-config';

let configured = false;
export function initAmplify() {
    if (!configured) {
        Amplify.configure(amplifyConfig);
        configured = true;
        // Optional: debug
        // console.log('Amplify Auth config:', (Amplify as any).getConfig?.().Auth);
    }
}
