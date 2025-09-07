'use server';

import { CognitoIdentityProviderClient, ListUsersCommand } from '@aws-sdk/client-cognito-identity-provider';

export const searchCognitoUsers = async (query: string) => {
  try {
    // Region: server-only first; no defaulting to client envs
    const region =
        process.env.AWS_REGION ||
        process.env.MY_AWS_REGION ||
        'us-east-1';

    // User Pool ID: server-only name; (optionally allow NEXT_PUBLIC_* as last resort)
    const userPoolId =
        process.env.COGNITO_USER_POOL_ID ||
        process.env.MY_COGNITO_USER_POOL_ID ||
        process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID;

    if (!userPoolId) {
      throw new Error('Missing COGNITO_USER_POOL_ID');
    }

    // Credentials:
    // Prefer role-based creds (no explicit creds). If keys are provided, use them.
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID || process.env.MY_AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || process.env.MY_AWS_SECRET_ACCESS_KEY;

    const client = new CognitoIdentityProviderClient({
      region,
      ...(accessKeyId && secretAccessKey
          ? { credentials: { accessKeyId, secretAccessKey } }
          : {}), // let SDK use the runtime role if keys are not set
    });

    const cmd = new ListUsersCommand({
      UserPoolId: userPoolId,
      // Optional: only add filter when query length is reasonable
      ...(query?.length ? { Filter: `email ^= "${query}"` } : {}),
      Limit: 10,
    });

    const res = await client.send(cmd);

    return (
        res.Users?.map(u => ({
          username: u.Username || '',
          email: u.Attributes?.find(a => a.Name === 'email')?.Value || '',
        })) || []
    );
  } catch (err) {
    console.error('searchCognitoUsers error:', err);
    return [];
  }
};
