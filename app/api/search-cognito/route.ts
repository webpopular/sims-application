// /app/api/search-cognito/route.ts
import { NextResponse } from 'next/server';
import { searchCognitoUsers } from '@/app/utils/aws/cognito.server';

export async function POST(request: Request) {
  try {
    console.log('🚀 /api/search-cognito invoked');

    const { query } = await request.json();
    console.log('📨 Received query:', query);

    if (!query) {
      console.warn('⚠️ No query provided in request body.');
      return NextResponse.json({ users: [] });
    }

    // Log all ENV variables for verification
    console.log('🔑 ENV - MY_AWS_ACCESS_KEY_ID:', process.env.MY_AWS_ACCESS_KEY_ID);
    console.log('🔑 ENV - MY_AWS_SECRET_ACCESS_KEY:', process.env.MY_AWS_SECRET_ACCESS_KEY);
    console.log('🔑 ENV - MY_AWS_REGION:', process.env.MY_AWS_REGION);
    console.log('🔑 ENV - NEXT_PUBLIC_COGNITO_USER_POOL_ID:', process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID);

    // Call Cognito search
    const users = await searchCognitoUsers(query);

    console.log('✅ Cognito search successful');
    console.log('🔍 Found users:', users);

    return NextResponse.json({ users });
  } catch (error: any) {
    console.error('❌ API /search-cognito error:', error?.message || error);
    return NextResponse.json({ users: [], error: 'Failed to fetch users' }, { status: 500 });
  }
}
