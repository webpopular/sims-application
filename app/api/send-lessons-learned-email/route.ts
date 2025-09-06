// app/api/send-lessons-learned-email/route.ts - CREATE this file
import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/app/utils/aws/ses';

export async function POST(request: NextRequest) {
  try {
    const { recipients, subject, body, lessonId, submissionId } = await request.json();
    
    if (!recipients || !subject || !body) {
      return NextResponse.json({ 
        error: 'Missing required fields: recipients, subject, body' 
      }, { status: 400 });
    }
    
    console.log(`📧 [LessonsLearnedEmail] Sending approval email for lesson ${lessonId}`);
    console.log(`📧 [LessonsLearnedEmail] Recipients: ${recipients.length}`);
    
    await sendEmail(recipients, subject, body);
    
    console.log(`✅ [LessonsLearnedEmail] Email sent successfully`);
    
    return NextResponse.json({ 
      success: true,
      message: 'Lessons learned email sent successfully',
      recipients: recipients.length,
      lessonId,
      submissionId
    });
  } catch (error) {
    console.error('❌ [LessonsLearnedEmail] Error sending email:', error);
    return NextResponse.json({ 
      error: 'Failed to send lessons learned email',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
