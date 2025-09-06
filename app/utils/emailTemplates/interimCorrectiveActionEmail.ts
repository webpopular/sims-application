// app/utils/emailTemplates/interimCorrectiveActionEmail.ts

import { InterimCorrectiveAction } from "@/app/types";

export const generateInterimCorrectiveActionEmail = (
    action: InterimCorrectiveAction,
    formData: any,
    senderName: string,
    senderEmail: string = "",
    isUpdate: boolean = false
  ) => {
    // Format the sender information as "Name <email>" if both are available
    const formattedSender = senderEmail 
      ? `${senderName} <${senderEmail}>`
      : senderName;
    
    return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <div style="background-color: #800000; padding: 15px; border-radius: 5px 5px 0 0;">
        <h2 style="color: white; margin: 0; font-size: 18px;">Interim Corrective Action ${isUpdate ? 'Update' : 'Assignment'}</h2>
      </div>
      
      <div style="padding: 20px; background-color: #f9f9f9;">
        <p>From: SIMS</p>
        <p>To: ${action.assignedTo}</p>
        <p>CC: ${formattedSender} (${senderEmail})</p>
        
        <div style="margin-top: 20px; padding: 15px; background-color: white; border-left: 4px solid #800000;">
          <h3 style="color: #800000; margin-top: 0;">Interim Corrective Action</h3>
          <p>${action.actionDescription}</p>
          
          <p><strong>Due Date:</strong> ${action.dueDate}</p>
          <p><strong>Status:</strong> ${getStatusLabel(action.icaStatus)}</p>
          
          <p>Once the action has been completed, please notify ${formattedSender} (${senderEmail}).</p>
        </div>
        
        <div style="margin-top: 20px; padding: 15px; background-color: white; border-left: 4px solid #666;">
          <h3 style="color: #3788ad; margin-top: 0;">Incident History</h3>
          <p><strong>Plant Location:</strong> ${formData?.locationOnSite || 'Not specified'}</p>
          <p><strong>Incident Date:</strong> ${formData?.dateOfIncident || 'Not specified'}</p>
          <p><strong>Where did this occur?:</strong> ${formData?.whereDidThisOccur || 'Not specified'}</p>
          <p><strong>Additional Location Detail:</strong> ${formData?.workAreaDescription || 'Not specified'}</p>
          
          <div style="margin-top: 10px;">
            <p><strong>Incident Description:</strong></p>
            <p>${formData?.incidentDescription || 'No description provided.'}</p>
          </div>
        </div>
        
        <div style="margin-top: 20px; color: #666; font-size: 12px; border-top: 1px solid #e0e0e0; padding-top: 15px;">
          <p>This is an automated message from the Safety Incident Management System (SIMS).</p>
          <p>Please do not reply to this email. If you have questions, please contact your safety coordinator.</p>
        </div>
      </div>
    </div>
    `;
  };

  
  // Helper function to get status label
  const getStatusLabel = (status: string): string => {
    const statusLabels: Record<string, string> = {
      "YET_TO_BEGIN": "Yet to Begin",
      "ACTION_IN_PROGRESS": "Action In Progress",
      "ACTION_COMPLETE_AND_FINAL": "Action Complete AND This Interim Action Is Now the Final Corrective Action",
      "ACTION_COMPLETE_STOP_GAP": "Action Complete - This is only a Stop Gap Measure. A Final Corrective action is Required"
    };
    
    return statusLabels[status] || status;
  };
  