// app/components/modals/QuickFixActionCompleteModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { generateClient } from "aws-amplify/data";
import { type Schema } from "@/amplify/data/schema";
import { getUserInfo } from '@/lib/utils/getUserInfo';
import toast from 'react-hot-toast';

const client = generateClient<Schema>();

interface QuickFixActionCompleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: any; // The quick fix record to complete
  onSuccess?: () => void;
}

const QuickFixActionCompleteModal = ({ 
  isOpen, 
  onClose, 
  record,
  onSuccess
}: QuickFixActionCompleteModalProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    incidentDescription: '',
    obsCorrectiveAction: '',
    quickFixNotes: ''
  });

  // Use useEffect to update the form data when the record changes
  useEffect(() => {
    if (record) {
      setFormData({
        incidentDescription: record.incidentDescription || '',
        obsCorrectiveAction: record.recordType === 'OBSERVATION_REPORT' 
          ? record.obsCorrectiveAction || '' 
          : record.quickFixDescribeCorrectiveActions || '',
        quickFixNotes: record.quickFixNotes || ''
      });
    }
  }, [record]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const userInfo = await getUserInfo();
      const updatedBy = userInfo.email || userInfo.username || 'Unknown';
      
      if (!record?.id) {
        toast.error("Record ID not found");
        setIsLoading(false);
        return;
      }

      const updateData = {
        id: record.id,
        incidentDescription: formData.incidentDescription,
        quickFixNotes: formData.quickFixNotes,
        quickFixStatus: "Completed",
        status: "Completed",
        investigationStatus: "Quick Fix Completed",
        quickFixUpdatedAt: new Date().toISOString(),
        quickFixUpdatedBy: updatedBy,
        ...(record.recordType === 'OBSERVATION_REPORT' 
          ? { obsCorrectiveAction: formData.obsCorrectiveAction } 
          : { quickFixDescribeCorrectiveActions: formData.obsCorrectiveAction })
      };
      

      // Add the correct field based on record type
      //if (record.recordType === 'OBSERVATION_REPORT') {
      //  updateData.obsCorrectiveAction = formData.obsCorrectiveAction;
     /// } else {
     //   updateData.quickFixDescribeCorrectiveActions = formData.obsCorrectiveAction;
      //}

      await client.models.Submission.update(updateData);

      toast.success("Quick Fix action completed successfully!");
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("Error completing quick fix action:", error);
      toast.error("Failed to complete quick fix action");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center overflow-y-auto p-4">
      <div className="bg-white rounded-lg max-w-xl w-full shadow-lg">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 rounded-t-lg">
          <h2 className="text-lg font-semibold text-gray-800">Complete Quick Fix Action</h2>
          <p className="text-sm text-gray-500 mt-1">Review and update details before marking as complete</p>
        </div>

        <div className="p-6">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* Problem Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Describe Problem or Issue <span className="text-red-500">*</span>
              </label>
              <textarea
                placeholder="Short Event Description (<500 characters)"
                name="incidentDescription"
                value={formData.incidentDescription}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-xs placeholder:font-mono"
                rows={3}
                maxLength={500}
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
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-xs placeholder:font-mono"
                rows={3}
                maxLength={500}
                required
                placeholder="Add any Corrective Action (<500 characters)"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                name="quickFixNotes"
                value={formData.quickFixNotes}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-xs placeholder:font-mono"
                rows={3}
                maxLength={500}
                required
                placeholder="Add any additional notes about this quick fix action (<500 characters)"
              />
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
                {isLoading ? "Saving..." : "Action Complete"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default QuickFixActionCompleteModal;
