// app/amplify-config.ts
import type { ResourcesConfig } from 'aws-amplify';

const req = (name: string, v?: string) => {
    if (!v) throw new Error(`[AmplifyConfig] Missing ${name}. Check your env vars.`);
    return v;
};

const region           = process.env.NEXT_PUBLIC_AWS_REGION ?? process.env.AWS_REGION;
const userPoolId       = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID ?? process.env.COGNITO_USER_POOL_ID;
const userPoolClientId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID ?? process.env.COGNITO_USER_POOL_CLIENT_ID;
const identityPoolId   = process.env.NEXT_PUBLIC_IDENTITY_POOL_ID; // optional
const graphqlEndpoint  = process.env.NEXT_PUBLIC_APPSYNC_API_URL ?? process.env.APPSYNC_API_URL;

export const amplifyConfig: ResourcesConfig = {
    Auth: {
        Cognito: {
            // ❌ no region here in v6
            userPoolId:       req('Cognito User Pool Id', userPoolId),
            userPoolClientId: req('Cognito User Pool Client Id', userPoolClientId),
            ...(identityPoolId ? { identityPoolId } : {}), // keep if you use IAM/federated identities
        },
    },
    API: {
        GraphQL: {
            endpoint:        req('AppSync GraphQL endpoint', graphqlEndpoint),
            region:          req('AWS region', region),     // ✅ region goes here
            defaultAuthMode: 'userPool',                    // your AppSync default auth
        },
    },
};

export default amplifyConfig;
