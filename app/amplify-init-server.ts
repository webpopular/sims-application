import { Amplify } from 'aws-amplify';
import { amplifyConfig } from '@/app/amplify-config';

let configured = false;

export function initAmplifyServer() {
    if (configured) return;
    Amplify.configure(amplifyConfig, { ssr: true });
    configured = true;
}

// auto-init on import for API routes
initAmplifyServer();
