// app/amplify-config.ts  (no "use client")
import type { ResourcesConfig } from 'aws-amplify';

const region   = process.env.AWS_REGION                  || process.env.NEXT_PUBLIC_AWS_REGION;
const poolId   = process.env.COGNITO_USER_POOL_ID        || process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID;
const clientId = process.env.COGNITO_USER_POOL_CLIENT_ID || process.env.NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID;
const apiUrl   = process.env.APPSYNC_API_URL             || process.env.NEXT_PUBLIC_APPSYNC_API_URL;

function req(name: string, v?: string) {
    if (!v) throw new Error(`[AmplifyConfig] Missing env: ${name}`);
    return v;
}

export const amplifyConfig: ResourcesConfig = {
    Auth: {
        Cognito: {
            region:          req('AWS_REGION/NEXT_PUBLIC_AWS_REGION', region),
            userPoolId:      req('COGNITO_USER_POOL_ID/NEXT_PUBLIC_COGNITO_USER_POOL_ID', poolId),
            userPoolClientId:req('COGNITO_USER_POOL_CLIENT_ID/NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID', clientId),
        },
    },
    API: {
        GraphQL: {
            endpoint: req('APPSYNC_API_URL/NEXT_PUBLIC_APPSYNC_API_URL', apiUrl),
            region:   req('AWS_REGION/NEXT_PUBLIC_AWS_REGION', region),
            defaultAuthMode: 'userPool',
        },
    },
};
