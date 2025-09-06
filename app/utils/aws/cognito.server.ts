
// app/utils/aws/cognito.server.ts
// app/utils/aws/cognito.server.ts
'use server';

import { CognitoIdentityProviderClient, ListUsersCommand } from "@aws-sdk/client-cognito-identity-provider";

export const searchCognitoUsers = async (query: string) => {
  try {
    // ✅ Region fallback
    const region = process.env.MY_AWS_REGION
      || process.env.AWS_REGION
      || process.env.NEXT_PUBLIC_AWS_REGION
      || 'us-east-1';

    // ✅ Access Key fallback
    const accessKeyId = process.env.MY_AWS_ACCESS_KEY_ID
      || process.env.AWS_ACCESS_KEY_ID
      || process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID;

    // ✅ Secret Access Key fallback
    const secretAccessKey = process.env.MY_AWS_SECRET_ACCESS_KEY
      || process.env.AWS_SECRET_ACCESS_KEY
      || process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY;

    // ✅ User Pool ID fallback
    const userPoolId = process.env.MY_COGNITO_USER_POOL_ID
      || process.env.AWS_COGNITO_USER_POOL_ID
      || process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID;

    // ✅ Validate
    if (!accessKeyId || !secretAccessKey || !userPoolId) {
      console.error('❌ Missing AWS credentials or Cognito User Pool ID in environment variables.');
      console.error('accessKeyId:', accessKeyId);
      console.error('secretAccessKey:', secretAccessKey ? 'Provided' : 'Missing');
      console.error('userPoolId:', userPoolId);
      return [];
    }

    console.log('✅ Using Cognito Config:');
    console.log('Region:', region);
    console.log('User Pool ID:', userPoolId);

    const cognitoClient = new CognitoIdentityProviderClient({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    const command = new ListUsersCommand({
      UserPoolId: userPoolId,
      Filter: `email ^= "${query}"`,
      Limit: 10,
    });

    const response = await cognitoClient.send(command);

    return response.Users?.map(user => ({
      username: user.Username || '',
      email: user.Attributes?.find(attr => attr.Name === 'email')?.Value || '',
    })) || [];

  } catch (error) {
    console.error('❌ Error searching users:', error);
    return [];
  }
};
