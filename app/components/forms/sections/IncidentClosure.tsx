// app/components/forms/sections/IncidentClosure.tsx
'use client';

import { ChevronDown, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import EmailNotification from "../notifications/EmailNotification";
import ApprovalEmailNotification from "../notifications/ApprovalEmailNotification";
//import { usePermissions } from '@/lib/utils/PermissionService'; // ✅ Add RBAC hook
import { useUserAccess } from '@/app/hooks/useUserAccess'; // ✅ FIXED: Use correct hook

interface IncidentClosureSectionProps {
  isExpanded: boolean;
  onToggle: () => void;
  onSave: (sectionName: string, data: any) => void;
  submissionId: string;
  existingClosureData?: {
    eventApprovalStatus?: string;
    eventApprovalDescription?: string;
  };
  recordType?: 'INJURY_REPORT' | 'OBSERVATION_REPORT';
}

// Define status constants to ensure consistency
const STATUS = {
  IN_PROGRESS: "ACTION_IN_PROGRESS",
  COMPLETE: "ACTION_COMPLETE",
  SEND_BACK: "SEND_BACK",
  PENDING_APPROVAL: "PENDING_APPROVAL"
};

export default function IncidentClosureSection({
  isExpanded,
  onToggle,
  onSave,
  submissionId,
  existingClosureData,
  recordType = 'INJURY_REPORT',
}: IncidentClosureSectionProps) {
  // ✅ Add RBAC permissions
  //const { canAccess, userRole, loading: permissionsLoading } = usePermissions();
  const { userAccess, hasPermission, loading, isReady } = useUserAccess();

  const [summary, setSummary] = useState<string>(existingClosureData?.eventApprovalDescription || '');
  const [closureStatus, setClosureStatus] = useState<string>(existingClosureData?.eventApprovalStatus || '');
  const [showEmailNotification, setShowEmailNotification] = useState(false);
  const [showApprovalEmailNotification, setShowApprovalEmailNotification] = useState(false);

  // ✅ Permission checks
  const canPerformApprovalIncidentClosure = hasPermission('canPerformApprovalIncidentClosure');
  const canTakeFirstReportActions = hasPermission('canTakeFirstReportActions');

  useEffect(() => {
    if (existingClosureData?.eventApprovalDescription) {
      setSummary(existingClosureData.eventApprovalDescription);
    }
    if (existingClosureData?.eventApprovalStatus) {
      setClosureStatus(existingClosureData.eventApprovalStatus);
    }
  }, [existingClosureData]);

  // Unified function to handle all status changes
  const handleStatusChange = (status: typeof STATUS[keyof typeof STATUS]) => {
    console.log(`✅ Status change triggered: ${status}`);
    console.log(`✅ Summary: ${summary}`);

    const updatedData: {
      eventApprovalStatus: string;
      eventApprovalDescription: string;
      status?: string;
      investigationStatus?: string;
    } = {
      eventApprovalStatus: status,
      eventApprovalDescription: summary
    };

    // Update the overall status based on the closure status
    if (status === STATUS.COMPLETE) {
      updatedData.status = "Completed";
      updatedData.investigationStatus = "Completed";
    } else if (status === STATUS.PENDING_APPROVAL) {
      updatedData.status = "Pending Approval";
      updatedData.investigationStatus = "Pending Approval";
    } else {
      updatedData.status = recordType === 'OBSERVATION_REPORT' 
        ? "Observation with RCA - Open" 
        : "Incident with RCA - Open";
    }

    onSave("incidentclosure", updatedData);
    setClosureStatus(status);

    // Show appropriate email notification
    if (status === STATUS.SEND_BACK) {
      setShowEmailNotification(true);
    } else if (status === STATUS.PENDING_APPROVAL) {
      setShowApprovalEmailNotification(true);
    }
  };

  // ✅ Handle Send For Approval action
  const handleSendForApproval = () => {
    if (!canTakeFirstReportActions) {
      alert('You do not have permission to send for approval.');
      return;
    }
    handleStatusChange(STATUS.PENDING_APPROVAL);
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case STATUS.IN_PROGRESS:
        return <span className="text-xs font-medium px-2 py-1 rounded-md bg-blue-100 text-blue-700">In Progress</span>;
      case STATUS.COMPLETE:
        return <span className="text-xs font-medium px-2 py-1 rounded-md bg-green-100 text-green-700">Completed</span>;
      case STATUS.SEND_BACK:
        return <span className="text-xs font-medium px-2 py-1 rounded-md bg-yellow-100 text-amber-800">Sent back to Author</span>;
      case STATUS.PENDING_APPROVAL:
        return <span className="text-xs font-medium px-2 py-1 rounded-md bg-purple-100 text-purple-800">Pending Approval</span>;
      default:
        return <span className="text-xs font-medium px-2 py-1 rounded-md bg-gray-100 text-gray-700">Not Started</span>;
    }
  };

  const handleEmailSuccess = () => {
    setShowEmailNotification(false);
  };

  const handleApprovalEmailSuccess = () => {
    setShowApprovalEmailNotification(false);
  };

  // Check if summary is empty (after trimming whitespace)
  const isSummaryEmpty = !summary.trim();

  // ✅ Show loading state while permissions are loading
  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading permissions...</div>;
  }

  return (
    <div className="border-b">
      {/* Email Notification Modal */}
      <EmailNotification
        isOpen={showEmailNotification}
        onClose={() => setShowEmailNotification(false)}
        onSuccess={handleEmailSuccess}
        reportId={submissionId}
        title={recordType === 'OBSERVATION_REPORT' 
          ? "Observation Report Sent Back for Review" 
          : "Incident Report Sent Back for Review"}
      />

      {/* ✅ New Approval Email Notification Modal */}
      <ApprovalEmailNotification
        isOpen={showApprovalEmailNotification}
        onClose={() => setShowApprovalEmailNotification(false)}
        onSuccess={handleApprovalEmailSuccess}
        submissionId={submissionId}
        title={recordType === 'OBSERVATION_REPORT' 
          ? "Observation Report - Approval Required" 
          : "Incident Report - Approval Required"}
        summary={summary}
        recordType={recordType}
      />
  
      {/* Section Header */}
      <button
        onClick={(e) => {
          e.preventDefault();
          onToggle();
        }}
        className={`w-full flex justify-between items-center px-4 py-3 text-sm font-medium transition-all duration-200 border-b border-gray-200 last:border-b-0
        ${isExpanded ? "bg-red-50" : "bg-white"} 
        hover:bg-red-200 hover:text-sm rounded-md`}
      >
        <div className="flex items-center">
          {isExpanded ? <ChevronDown className="h-5 w-5 mr-2" /> : <ChevronRight className="h-5 w-5 mr-2" />}
          <span>{recordType === 'OBSERVATION_REPORT' ? 'Observation Closure' : 'Incident Closure'}</span>
        </div>
        {getStatusLabel(closureStatus)}
      </button>
  
      {isExpanded && (
        <div className="p-4">
  


          {/* Incident/Observation Closure Form Card */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200 mb-6">
            <div className="bg-slate-50 px-4 py-3 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-800">
                {recordType === 'OBSERVATION_REPORT' ? 'Observation' : 'Incident'} Closure Summary
              </h2>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="block text-gray-700 text-xs uppercase tracking-wider font-bold">
                  Final Closure Details
                </label>
                <textarea
                  placeholder="Enter final closure summary... (<400 characters)"
                  className="w-full p-2 border border-gray-300 rounded-md text-sm placeholder:text-xs placeholder:font-mono focus:ring-red-500 focus:border-transparent transition-all"
                  rows={4}
                  value={summary}
                  maxLength={400}
                  onChange={(e) => setSummary(e.target.value)}
                  disabled={!canPerformApprovalIncidentClosure && !canTakeFirstReportActions}
                />
              </div>
              
              {/* ✅ Permission-based Action Buttons */}
              <div className="flex justify-end mt-6 pt-4 border-t border-gray-100">
                {/* ✅ Buttons for users who can take first report actions */}
                {canTakeFirstReportActions && (
                  <>
                    <button
                      onClick={() => handleStatusChange(STATUS.IN_PROGRESS)}
                      className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors shadow-sm flex items-center gap-2 mr-3"
                      type="button"
                    >
                      Review In Progress
                    </button>

                    {/* ✅ New Send For Approval Button */}
                    <button
                      onClick={handleSendForApproval}
                      className={`px-4 py-2 ${isSummaryEmpty ? "bg-purple-300 cursor-not-allowed" : "bg-purple-600 hover:bg-purple-700"} text-white rounded-md transition-colors shadow-sm flex items-center gap-2 mr-3`}
                      disabled={isSummaryEmpty}
                      type="button"
                      title={`Send this ${recordType === 'OBSERVATION_REPORT' ? 'observation' : 'incident'} for approval to close`}
                    >
                      Send For Approval
                    </button>

                    <button
                      onClick={() => handleStatusChange(STATUS.SEND_BACK)}
                      className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors shadow-sm flex items-center gap-2"
                      type="button"
                    >
                      Send Back To Author
                    </button>
                  </>
                )}

                {/* ✅ Approve For Closure - Only for users with approval permissions */}
                {canPerformApprovalIncidentClosure && (
                  <button
                    onClick={() => handleStatusChange(STATUS.COMPLETE)}
                    className={`px-4 py-2 ${isSummaryEmpty ? "bg-green-300 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"} text-white rounded-md transition-colors shadow-sm flex items-center gap-2 mr-3`}
                    disabled={isSummaryEmpty}
                    type="button"
                    title={`Add the final closure details for this ${recordType === 'OBSERVATION_REPORT' ? 'observation' : 'incident'}`}
                  >
                    Approve For Closure
                  </button>
                )}

                {/* ✅ Show message if user has no permissions */}
                {!canPerformApprovalIncidentClosure && !canTakeFirstReportActions && (
                  <div className="text-sm text-gray-600 italic">
                    You have read-only access to this closure section.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
