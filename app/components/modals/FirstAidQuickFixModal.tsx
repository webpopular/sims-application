// app/components/modals/FirstAidQuickFixModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { generateClient } from "aws-amplify/data";
import { getCurrentUser } from "aws-amplify/auth";
import { type Schema } from "@/amplify/data/schema";
import { useLookupData } from "@/app/utils/useLookupData";
import toast from 'react-hot-toast';
import { getUserInfo } from '@/lib/utils/getUserInfo';
import QuickFixEmailNotification from '../forms/notifications/QuickFixEmailNotification'; // ✅ Correct import path
import { useRouter } from 'next/navigation'; // ✅ Add router for navigation

const client = generateClient<Schema>();

interface FirstAidQuickFixModalProps {
  isOpen: boolean;
  onClose: () => void;
  submissionId: string;
  onSuccess?: () => void;
}

const FirstAidQuickFixModal = ({ isOpen, onClose, submissionId, onSuccess }: FirstAidQuickFixModalProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showQuickFixNotification, setShowQuickFixNotification] = useState(false);
  const [submissionData, setSubmissionData] = useState<any>(null);
  const [formData, setFormData] = useState({
    quickFixWasthisIncidentIventigated: false,
    quickFixDescribeCorrectiveActions: "",
    quickFixDirectCauseGroup: "",
    quickFixSubGroup: "",
    quickFixRootCause: ""
  });

  const { referenceData, getOptions } = useLookupData();
  const router = useRouter(); // ✅ Add router for navigation
  
  const directCauseGroupMap = referenceData.directCauseGroupMap || {};
  const groupOptions = Object.keys(directCauseGroupMap);
  const selectedSubGroups = directCauseGroupMap[formData.quickFixDirectCauseGroup] || [];
  const rootCauses = getOptions("Root Cause");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  useEffect(() => {
    if (formData.quickFixSubGroup && !selectedSubGroups.includes(formData.quickFixSubGroup)) {
      setFormData(prev => ({ ...prev, quickFixSubGroup: "" }));
    }
  }, [formData.quickFixDirectCauseGroup]);

  // ✅ Enhanced handleSubmit - prevent double notifications
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const userInfo = await getUserInfo();
      const updatedBy = userInfo.email || userInfo.username || 'Unknown';
      
      const existing = await client.models.Submission.list({ filter: { submissionId: { eq: submissionId } } });
      if (!existing.data.length) {
        console.error("❌ Submission not found:", submissionId);
        toast.error("Submission not found");
        setIsLoading(false);
        return;
      }

      const submission = existing.data[0];

      // ✅ Update the submission with Quick Fix details
      const updatedSubmission = await client.models.Submission.update({
        id: submission.id,
        injuryCategory: "First Aid",
        quickFixWasthisIncidentIventigated: formData.quickFixWasthisIncidentIventigated,
        quickFixDescribeCorrectiveActions: formData.quickFixDescribeCorrectiveActions,
        quickFixDirectCauseGroup: formData.quickFixDirectCauseGroup,
        quickFixSubGroup: formData.quickFixSubGroup,
        quickFixRootCause: formData.quickFixRootCause,
        quickFixUpdatedAt: new Date().toISOString(),
        quickFixUpdatedBy: updatedBy,
        quickFixStatus: "Completed",
        investigationStatus: "Quick Fix Completed",
        status: "Completed"
      });

      console.log("✅ Quick Fix saved");
      toast.success("Quick Fix RCA submitted successfully!");

      // ✅ Store submission data for the notification
      setSubmissionData({
        ...submission,
        quickFixDescribeCorrectiveActions: formData.quickFixDescribeCorrectiveActions,
        quickFixDirectCauseGroup: formData.quickFixDirectCauseGroup,
        quickFixSubGroup: formData.quickFixSubGroup,
        quickFixRootCause: formData.quickFixRootCause,
        updatedBy: updatedBy,
        incidentDescription: submission.incidentDescription || 'No description available'
      });

      // ✅ Show the QuickFixEmailNotification modal
      setShowQuickFixNotification(true);

    } catch (err) {
      console.error("❌ Submit error:", err);
      toast.error("Failed to submit Quick Fix RCA.");
      setIsLoading(false);
    }
  };

  // ✅ Handle notification success - GO TO HOME PAGE
  const handleNotificationSuccess = () => {
    console.log("✅ Quick Fix notification sent successfully");
    setShowQuickFixNotification(false);
    setIsLoading(false);
    
    // ✅ Close the Quick Fix modal completely
    onClose();
    
    // ✅ Navigate to home page instead of calling onSuccess
    router.push('/');
    
    // ✅ DO NOT call onSuccess - this prevents the classification modal
    // onSuccess?.(); // ❌ REMOVED - this was causing the classification modal to open
  };

  // ✅ Handle notification close without sending - GO TO HOME PAGE
  const handleNotificationClose = () => {
    console.log("✅ Quick Fix notification closed without sending");
    setShowQuickFixNotification(false);
    setIsLoading(false);
    
    // ✅ Close the Quick Fix modal completely
    onClose();
    
    // ✅ Navigate to home page instead of calling onSuccess
    router.push('/');
    
    // ✅ DO NOT call onSuccess - this prevents the classification modal
    // onSuccess?.(); // ❌ REMOVED - this was causing the classification modal to open
  };

  if (!isOpen) return null;

  return (
    <>
      {/* ✅ Only show Quick Fix modal if notification is not showing */}
      {!showQuickFixNotification && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center overflow-y-auto p-4">
          <div className="bg-white rounded-lg max-w-xl w-full shadow-lg">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 rounded-t-lg">
              <h2 className="text-lg font-semibold text-gray-800">Quick RCA Details</h2>
              <p className="text-sm text-gray-500 mt-1">Complete this form to document corrective actions for this incident</p>
            </div>

            <div className="p-6">
              <form className="space-y-5" onSubmit={handleSubmit}>
                {/* Investigation Checkbox */}
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      name="quickFixWasthisIncidentIventigated"
                      checked={formData.quickFixWasthisIncidentIventigated}
                      onChange={handleChange}
                      required
                      className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Was this Incident Investigated?</span><span className="text-red-500">*</span>
                  </label>
                </div>

                {/* Corrective Actions */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Describe Corrective Actions <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="quickFixDescribeCorrectiveActions"
                    value={formData.quickFixDescribeCorrectiveActions}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    required
                  />
                </div>

                {/* Group/SubGroup Dropdown */}
                <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Cause Analysis</h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Direct Cause Group <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="quickFixDirectCauseGroup"
                        value={formData.quickFixDirectCauseGroup}
                        onChange={handleChange}
                        required
                        className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white"
                      >
                        <option value="">Select a direct cause group</option>
                        {groupOptions.map(group => (
                          <option key={group} value={group}>{group}</option>
                        ))}
                      </select>
                    </div>

                    {formData.quickFixDirectCauseGroup && selectedSubGroups.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Direct Cause Sub Group <span className="text-red-500">*</span>
                        </label>
                        <select
                          name="quickFixSubGroup"
                          value={formData.quickFixSubGroup}
                          onChange={handleChange}
                          required
                          className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white"
                        >
                          <option value="">Select a sub-group</option>
                          {selectedSubGroups.map((item, idx) => (
                            <option key={idx} value={item}>{item}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Root Cause */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Root Cause <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="quickFixRootCause"
                        value={formData.quickFixRootCause}
                        onChange={handleChange}
                        required
                        className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white"
                      >
                        <option value="">Select a root cause</option>
                        {rootCauses.map(item => (
                          <option key={item.id} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 border border-gray-300 text-gray-700 bg-white rounded-md hover:bg-gray-50"
                    disabled={isLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#cb4154] text-white rounded-md hover:bg-[#800000]"
                    disabled={isLoading}
                  >
                    {isLoading ? "Submitting..." : "Submit Quick RCA"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ✅ QuickFixEmailNotification Modal - only show when needed */}
      {showQuickFixNotification && submissionData && (
        <QuickFixEmailNotification
          isOpen={showQuickFixNotification}
          onClose={handleNotificationClose}
          onSuccess={handleNotificationSuccess}
          submissionId={submissionId}
          assignedTo={submissionData.updatedBy || 'Unknown'}
          dueDate={''}
          title={`Quick Fix Completed - ${submissionId}`}
          problemDescription={submissionData.incidentDescription}
          correctiveAction={formData.quickFixDescribeCorrectiveActions}
        />
      )}
    </>
  );
};

export default FirstAidQuickFixModal;
