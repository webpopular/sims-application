// app/amplify-config.ts
import type { ResourcesConfig } from 'aws-amplify';

const region =
    process.env.NEXT_PUBLIC_AWS_REGION ?? process.env.AWS_REGION;
const userPoolId =
    process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID ?? process.env.COGNITO_USER_POOL_ID;
const userPoolClientId =
    process.env.NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID ?? process.env.COGNITO_USER_POOL_CLIENT_ID;
const identityPoolId =
    process.env.NEXT_PUBLIC_IDENTITY_POOL_ID
const graphqlEndpoint =
    process.env.NEXT_PUBLIC_APPSYNC_API_URL ?? process.env.APPSYNC_API_URL;

function req(name: string, v?: string) {
    if (!v) throw new Error(`[AmplifyConfig] Missing ${name}. Check your env vars.`);
    return v;
}

export const amplifyConfig: ResourcesConfig = {
    Auth: {
        Cognito: {
            region:           req('AWS region', region),
            userPoolId:       req('Cognito User Pool Id', userPoolId),
            userPoolClientId: req('Cognito User Pool Client Id', userPoolClientId),
            identityPoolId:   req('Cognito Identity Pool Id', identityPoolId), // <-- add this
        },
    },
    API: {
        GraphQL: {
            endpoint:        req('AppSync GraphQL endpoint', graphqlEndpoint),
            region:          req('AWS region', region),
            // If your AppSync default auth is Cognito User Pool, keep this:
            defaultAuthMode: 'iam',
            // If you also use IAM on some resolvers, you can call with authMode: 'iam' per request.
        },
    },
};
