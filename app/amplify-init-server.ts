// app/amplify-init-server.ts
import { Amplify } from 'aws-amplify';
import { amplifyConfig } from '@/app/amplify-config';

let configured = false;
export function initAmplifyServer() {
    if (!configured) {
        Amplify.configure(amplifyConfig, { ssr: true });
        configured = true;
    }
}
initAmplifyServer(); // auto-init on import
