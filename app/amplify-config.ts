// app/config/amplify-config.ts  (no "use client")
import type { ResourcesConfig } from 'aws-amplify';

const region   = process.env.NEXT_PUBLIC_AWS_REGION!;
const poolId   = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID!;
const clientId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID!;
const apiUrl   = process.env.NEXT_PUBLIC_APPSYNC_API_URL; // optional

export const amplifyConfig: ResourcesConfig = {
    Auth: {
        Cognito: {
            region,
            userPoolId: poolId,
            userPoolClientId: clientId,
        },
    },
    ...(apiUrl ? {
        API: {
            GraphQL: {
                endpoint: apiUrl,
                region,
                defaultAuthMode: 'userPool',
            },
        },
    } : {}),
};
