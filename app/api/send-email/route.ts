// /app/api/send-email/route.ts

import { NextResponse } from 'next/server';
import { sendEmail } from '@/app/utils/aws/ses';

export async function POST(request: Request) {
  try {
    const { recipients, subject, body } = await request.json();

    console.log('📧 Sending email:', { recipients, subject });

    const success = await sendEmail(recipients, subject, body);

    return NextResponse.json({ success });
  } catch (error) {
    console.error('❌ API /send-email error:', error);
    return NextResponse.json({ success: false, error: 'Failed to send email' }, { status: 500 });
  }
}
