// app/components/modals/QuickFixActionsObservationModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { generateClient } from "aws-amplify/data";
import { getCurrentUser } from "aws-amplify/auth";
import { type Schema } from "@/amplify/data/schema";
import { useLookupData } from "@/app/utils/useLookupData";
import { getUserInfo } from '@/lib/utils/getUserInfo';
import toast from 'react-hot-toast';
import QuickFixEmailNotification from '../forms/notifications/QuickFixEmailNotification';

const client = generateClient<Schema>();

interface QuickFixActionsObservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  submissionId: string;
  onSuccess?: () => void;
  existingData?: any;
}

const QuickFixActionsObservationModal = ({ 
  isOpen, 
  onClose, 
  submissionId, 
  onSuccess,
  existingData
}: QuickFixActionsObservationModalProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showEmailNotification, setShowEmailNotification] = useState(false);
  const [formData, setFormData] = useState({
    quickFixDueDate: existingData?.quickFixDueDate || "",
    quickFixAssignTo: existingData?.quickFixAssignTo || "",
    quickFixStatus: existingData?.quickFixStatus || "Assigned",
    quickFixNotes: existingData?.quickFixNotes || "",
    incidentDescription: existingData?.incidentDescription || "",
    obsCorrectiveAction: existingData?.obsCorrectiveAction || ""
  });

  // Fetch existing data if available
  useEffect(() => {
    if (existingData) {
      setFormData({
        quickFixDueDate: existingData.quickFixDueDate || "",
        quickFixAssignTo: existingData.quickFixAssignTo || "",
        quickFixStatus: existingData.quickFixStatus || "Assigned",
        quickFixNotes: existingData.quickFixNotes || "",
        incidentDescription: existingData.incidentDescription || "",
        obsCorrectiveAction: existingData.obsCorrectiveAction || ""
      });
    }
  }, [existingData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const userInfo = await getUserInfo();
      const updatedBy = userInfo.email || userInfo.username || 'Unknown';
      
      const existing = await client.models.Submission.list({ 
        filter: { submissionId: { eq: submissionId } } 
      });
      
      if (!existing.data.length) {
        console.error("❌ Submission not found:", submissionId);
        toast.error("Submission not found");
        setIsLoading(false); // Important: Clear loading state on error
        return;
      }

      const submission = existing.data[0];

      await client.models.Submission.update({
        id: submission.id,
        quickFixDueDate: formData.quickFixDueDate,
        quickFixAssignTo: formData.quickFixAssignTo,
        quickFixStatus: formData.quickFixStatus,
        quickFixNotes: formData.quickFixNotes,
        incidentDescription: formData.incidentDescription,
        obsCorrectiveAction: formData.obsCorrectiveAction,
        quickFixUpdatedAt: new Date().toISOString(),
        quickFixUpdatedBy: updatedBy,
        investigationStatus: "Quick Fix Completed",
        status: formData.quickFixStatus === "Completed" ? "Completed" : "Open"
      });

      console.log("✅ Quick Fix Actions saved");
      toast.success("Quick Fix Actions saved successfully!");
      
      // Clear loading state before showing email notification
      setIsLoading(false);
      
      // Show email notification modal if there's an assignee
      if (formData.quickFixAssignTo) {
        setShowEmailNotification(true);
      } else {
        onSuccess?.();
        onClose();
      }
    } catch (err) {
      console.error("❌ Submit error:", err);
      toast.error("Failed to save Quick Fix Actions.");
      setIsLoading(false); // Important: Clear loading state on error
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center overflow-y-auto p-4">
        <div className="bg-white rounded-lg max-w-xl w-full shadow-lg">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 rounded-t-lg">
            <h2 className="text-lg font-semibold text-gray-800">Quick Fix Actions</h2>
            <p className="text-sm text-gray-500 mt-1">Complete this form to document actions for this observation</p>
          </div>

          <div className="p-6">
            <form className="space-y-5" onSubmit={handleSubmit}>
              {/* Due Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Due Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="quickFixDueDate"
                  value={formData.quickFixDueDate}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Assigned To */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assigned To <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="quickFixAssignTo"
                  value={formData.quickFixAssignTo}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status <span className="text-red-500">*</span>
                </label>
                <select
                  name="quickFixStatus"
                  value={formData.quickFixStatus}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Assigned">Assigned</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              {/* Problem Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Describe Problem or Issue <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="incidentDescription"
                  value={formData.incidentDescription}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  required
                />
              </div>

              {/* Corrective Action */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Describe Corrective Action <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="obsCorrectiveAction"
                  value={formData.obsCorrectiveAction}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  required
                />
              </div>

              {/* Notes */}
              {/* <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Additional Notes
                </label>
                <textarea
                  name="quickFixNotes"
                  value={formData.quickFixNotes}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={2}
                />
              </div>*/}

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
                  {isLoading ? "Saving..." : "Save Quick Fix Actions"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Email Notification Modal */}
      <QuickFixEmailNotification
        isOpen={showEmailNotification}
        onClose={() => {
          setShowEmailNotification(false);
          onSuccess?.();
          onClose();
        }}
        onSuccess={() => {
          setShowEmailNotification(false);
          onSuccess?.();
          onClose();
        }}
        submissionId={submissionId}
        assignedTo={formData.quickFixAssignTo}
        dueDate={formData.quickFixDueDate}
        title={existingData?.title || ""}
        problemDescription={formData.incidentDescription}
        correctiveAction={formData.obsCorrectiveAction}
      />
    </>
  );
};

export default QuickFixActionsObservationModal;
