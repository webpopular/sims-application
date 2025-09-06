//app/api/send-safety-alert-email/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/app/utils/aws/ses';

export async function POST(request: NextRequest) {
  try {
    const { recipients, subject, body } = await request.json();
    
    if (!recipients || !subject || !body) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Send email to each recipient
    const emailPromises = recipients.map(async (recipient: string) => {
        return sendEmail([recipient], subject, body);
      });
    
    await Promise.all(emailPromises);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending safety alert email:', error);
    return NextResponse.json({ error: 'Failed to send safety alert email' }, { status: 500 });
  }
}
