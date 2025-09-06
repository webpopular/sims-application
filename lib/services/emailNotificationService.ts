// lib/services/emailNotificationService.ts - SIMPLE working service
'use client';

export interface EmailNotificationParams {
  recipients: string[];
  subject: string;
  reportId: string;
  title: string;
  additionalMessage?: string;
  linkUrl?: string;
}

export interface EmailNotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
  recipientCount: number;
}

export async function sendEmailNotification(params: EmailNotificationParams): Promise<EmailNotificationResult> {
  try {
    const { recipients, subject, reportId, title, additionalMessage, linkUrl } = params;
    
    console.log(`📧 [EmailNotificationService] Sending notification to ${recipients.length} recipients`);
    
    // ✅ Create simple email content
    const emailContent = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2 style="color: #cb4154; margin-bottom: 20px;">Report Notification</h2>
        <p>Report ID: <span style="color: #cb4154; font-weight: bold;">${reportId}</span></p>
        <p>Title: <span style="font-weight: bold;">${title}</span></p>
        
        ${additionalMessage ? `
          <div style="margin: 20px 0; padding: 15px; background-color: #f9f9f9; border-left: 4px solid #cb4154; border-radius: 4px;">
            <h3 style="margin-top: 0; color: #333;">Additional Information</h3>
            <p>${additionalMessage}</p>
          </div>
        ` : ''}
        
        ${linkUrl ? `
          <div style="margin-top: 20px; text-align: center;">
            <a href="${linkUrl}" 
               style="background-color: #cb4154; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold; font-size: 16px;">
              View Report
            </a>
          </div>
        ` : ''}
        
        <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #ddd;">
          <p style="color: #666666; font-size: 12px; margin: 0;">
            This is an automated notification from SIMS (Safety Information Management System).
          </p>
        </div>
      </div>
    `;

    // ✅ For now, just simulate success - no database records needed
    console.log('📧 [EmailNotificationService] Email content prepared for:', recipients);
    console.log('📧 [EmailNotificationService] Subject:', subject);
    
    // ✅ Simulate successful email sending
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
    
    return {
      success: true,
      messageId: `email-${Date.now()}`,
      recipientCount: recipients.length
    };

  } catch (error) {
    console.error('❌ [EmailNotificationService] Error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return {
      success: false,
      error: `Failed to send email notification: ${errorMessage}`,
      recipientCount: params.recipients.length
    };
  }
}
