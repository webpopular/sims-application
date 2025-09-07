// app/api/user/route.ts

//USE util instead

import {NextResponse} from 'next/server';
import {fetchAuthSession} from 'aws-amplify/auth';
import '@/app/amplify-config';


export async function GET() {
  try {
    const session = await fetchAuthSession();
    const idToken = session.tokens?.idToken?.toString();

    if (!idToken) {
      return NextResponse.json({ message: 'No session tokens found' }, { status: 401 });
    }

    const payload = JSON.parse(
        Buffer.from(idToken.split('.')[1], 'base64').toString('utf-8')
    );

    // Pull email and groups straight from the token
    const email = payload.email ?? payload['cognito:username'] ?? '';
    const groups: string[] = payload['cognito:groups'] ?? [];

    const userData = {
      username: payload['cognito:username'] ?? payload.sub,
      email,
      userId: payload.sub,
      groups,
    };

    return NextResponse.json({ user: userData }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching user data:', error);
    return NextResponse.json({ message: 'Failed to fetch user data', error: error.message }, { status: 500 });
  }
}
