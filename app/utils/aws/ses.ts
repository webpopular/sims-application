// app/utils/aws/ses.ts
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

export const sendEmail = async (recipients: string[], subject: string, content: string) => {
  try {
 

    // Safe region and credential fallbacks (like you did for Cognito!)
    const region = process.env.MY_AWS_REGION
      || process.env.AWS_REGION
      || process.env.NEXT_PUBLIC_AWS_REGION
      || 'us-east-1';

    const accessKeyId = process.env.MY_AWS_ACCESS_KEY_ID
      || process.env.AWS_ACCESS_KEY_ID
      || process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID;

    const secretAccessKey = process.env.MY_AWS_SECRET_ACCESS_KEY
      || process.env.AWS_SECRET_ACCESS_KEY
      || process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY;

    const fromEmail = process.env.NEXT_PUBLIC_SES_FROM_EMAIL;

    if (!accessKeyId || !secretAccessKey || !fromEmail) {
      console.error('❌ SES Util: Missing AWS SES credentials or fromEmail environment variable.');
      console.error('accessKeyId:', accessKeyId ? 'Provided' : 'Missing');
      console.error('secretAccessKey:', secretAccessKey ? 'Provided' : 'Missing');
      console.error('fromEmail:', fromEmail ? fromEmail : 'Missing');
      return false;
    }

    console.log('✅ SES Client Config:');
    console.log('Region:', region);
    console.log('From Email:', fromEmail);
    console.log('Recipients:', recipients);
    console.log('Subject:', subject);
    console.log('Email Body Preview:', content.substring(0, 200)); // To avoid big logs

    const sesClient = new SESClient({ 
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    const command = new SendEmailCommand({
      Destination: {
        ToAddresses: recipients,
      },
      Message: {
        Body: {
          Html: {
            Data: content,
          },
        },
        Subject: {
          Data: subject,
        },
      },
      Source: fromEmail,
    });

    try {
      const response = await sesClient.send(command);
      console.log('📧 SES SendEmail response:', response);
      return { success: true };
    } catch (emailError: any) {
      // Handle SES-specific errors
      if (emailError.name === 'MessageRejected') {
        console.warn('SES MessageRejected:', emailError.message);
        // Return partial success to prevent blocking the UI flow
        return { 
          success: false, 
          error: 'Email delivery failed: recipient not verified in SES sandbox',
          details: emailError.message
        };
      }
      
      // Re-throw other errors
      throw emailError;
    }
  } catch (error) {
    console.error('SES SendEmail - Error sending email:', error);
    return { 
      success: false, 
      error: 'Failed to send email',
      details: error instanceof Error ? error.message : String(error)
    };
  }
};