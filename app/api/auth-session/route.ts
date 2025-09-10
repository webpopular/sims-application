// app/api/auth-session/route.ts
import { NextResponse } from 'next/server';
import { createServerRunner } from '@aws-amplify/adapter-nextjs';
import { fetchAuthSession } from 'aws-amplify/auth/server';
import { amplifyConfig } from '@/app/amplify-config';
export const { runWithAmplifyServerContext } = createServerRunner({
  config: amplifyConfig,
});
export async function GET(request: Request) {
  return runWithAmplifyServerContext(
      { nextServerContext: { request }, config: amplifyConfig },
      async (ctx) => {
        const s = await fetchAuthSession(ctx);
        const idToken = s.tokens?.idToken?.toString();
        return NextResponse.json({
          ok: !!idToken,
          hasIdToken: !!idToken,
          identityId: s.identityId ?? null,
        }, { status: idToken ? 200 : 401 });
      }
  );
}
