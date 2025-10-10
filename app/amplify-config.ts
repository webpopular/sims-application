// app/amplify-config.ts
import type { ResourcesConfig } from 'aws-amplify';
interface ExtendedResourcesConfig extends ResourcesConfig {
    data?: {
        url: string;
        region: string;
        authMode: 'userPool' | 'apiKey' | 'iam';
    };
}

const req = (name: string, v?: string) => {
    if (!v) throw new Error(`[AmplifyConfig] Missing ${name}. Check your env vars.`);
    return v;
};

const region           = process.env.NEXT_PUBLIC_AWS_REGION ?? process.env.AWS_REGION;
const userPoolId       = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID ?? process.env.COGNITO_USER_POOL_ID;
const userPoolClientId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID ?? process.env.COGNITO_USER_POOL_CLIENT_ID;
const identityPoolId   = process.env.NEXT_PUBLIC_IDENTITY_POOL_ID; // REQUIRED by type
const graphqlEndpoint  = process.env.NEXT_PUBLIC_APPSYNC_API_URL ?? process.env.APPSYNC_API_URL;

export const amplifyConfig: ExtendedResourcesConfig = {
    Auth: {
        Cognito: {
            userPoolId:       req('Cognito User Pool Id', userPoolId),
            userPoolClientId: req('Cognito User Pool Client Id', userPoolClientId),
            identityPoolId:   req('Cognito Identity Pool Id', identityPoolId),
        },
    },
    API: {
        GraphQL: {
            endpoint:        req('AppSync GraphQL endpoint', graphqlEndpoint),
            region:          req('AWS region', region),  // region belongs on API
            defaultAuthMode: 'userPool',                 // you’re sending the Cognito ID token
        },
    },
    data: {
        url: req('AppSync GraphQL endpoint', graphqlEndpoint),
        region: req('AWS region', region),
        authMode: 'userPool', // or 'apiKey' if you rely on guest access
    },
};

export default amplifyConfig;
