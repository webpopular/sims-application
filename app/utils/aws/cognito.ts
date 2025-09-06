//app/utils/aws/cognito.ts
import { CognitoIdentityProviderClient, ListUsersCommand } from "@aws-sdk/client-cognito-identity-provider";
import { fromEnv } from "@aws-sdk/credential-provider-env";

export const searchCognitoUsers = async (query: string) => {
  try {
    const cognitoClient = new CognitoIdentityProviderClient({
      region: 'us-east-1',
      credentials: fromEnv(), // ✅ Use from environment
    });

    console.log('Cognito User Pool ID:', process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID);

    if (!process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID) {
      console.error('UserPoolId is not configured');
      return [];
    }

    const command = new ListUsersCommand({
      UserPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID,
      Filter: `email ^= "${query}"`,
      Limit: 10
    });

    const response = await cognitoClient.send(command);

    return response.Users?.map(user => ({
      username: user.Username || '',
      email: user.Attributes?.find(attr => attr.Name === 'email')?.Value || ''
    })) || [];

  } catch (error) {
    console.error('Error searching users:', error);
    return [];
  }
};
