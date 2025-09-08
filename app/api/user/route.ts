// app/api/user/route.ts

//USE util instead

import { NextResponse } from 'next/server';
import { fetchAuthSession } from 'aws-amplify/auth';
import { Amplify } from 'aws-amplify';
import config from '@/amplify_outputs.json';
import {
  CognitoIdentityProviderClient,
  AdminGetUserCommand,
  AdminListGroupsForUserCommand
} from "@aws-sdk/client-cognito-identity-provider";

Amplify.configure(config);

export async function GET() {
  try {
    const session = await fetchAuthSession();

    if (!session.tokens?.idToken) {
      return NextResponse.json({ message: "No session tokens found" }, { status: 401 });
    }

    // Extract username (sub) from ID token payload
    const idToken = session.tokens.idToken.toString();
    const payload = JSON.parse(
      Buffer.from(idToken.split('.')[1], 'base64').toString('utf-8')
    );

    const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID;
    if (!userPoolId) {
      throw new Error("User pool ID is not set in environment variables");
    }

    const cognitoClient = new CognitoIdentityProviderClient({ region: "us-east-1" });

    // Fetch full user attributes
    const adminGetUser = await cognitoClient.send(new AdminGetUserCommand({
      UserPoolId: userPoolId,
      Username: payload.sub,
    }));

    const emailAttr = adminGetUser.UserAttributes?.find(attr => attr.Name === 'email');
    const email = emailAttr?.Value || 'No email found';

    // Fetch user groups
    const groupResponse = await cognitoClient.send(new AdminListGroupsForUserCommand({
      Username: payload.sub,
      UserPoolId: userPoolId,
    }));

    const groups = groupResponse.Groups?.map(group => group.GroupName) || [];

    const userData = {
      username: payload.sub,
      email,
      userId: payload.sub,
      groups,
    };

    console.log('✅ User data fetched:', userData);

    return NextResponse.json({ user: userData }, { status: 200 });

  } catch (error) {
    console.error("❌ Error fetching user data:", error);
    return NextResponse.json(
      { message: "Failed to fetch user data", error: (error as Error).message },
      { status: 500 }
    );
  }
}
