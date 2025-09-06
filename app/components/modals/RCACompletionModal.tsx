// app/components/modals/RCACompletionModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useLookupData } from "@/app/utils/useLookupData";

interface RCACompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    rcaDirectCauseGroup: string;
    rcaDirectCauseSubGroup: string;
    rcaIdentifyDirectCause: string;
  }) => void;
}

const RCACompletionModal = ({ isOpen, onClose, onSave }: RCACompletionModalProps) => {
  const [formData, setFormData] = useState({
    rcaDirectCauseGroup: "",
    rcaDirectCauseSubGroup: "",
    rcaIdentifyDirectCause: ""
  });

  const { referenceData, getOptions } = useLookupData();
  const directCauseGroupMap = referenceData.directCauseGroupMap || {};
  const groupOptions = Object.keys(directCauseGroupMap);
  const selectedSubGroups = directCauseGroupMap[formData.rcaDirectCauseGroup] || [];
  const rootCauses = getOptions("Root Cause");

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    if (formData.rcaDirectCauseSubGroup && !selectedSubGroups.includes(formData.rcaDirectCauseSubGroup)) {
      setFormData(prev => ({ ...prev, rcaDirectCauseSubGroup: "" }));
    }
  }, [formData.rcaDirectCauseGroup]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center overflow-y-auto p-4">
      <div className="bg-white rounded-lg max-w-xl w-full shadow-lg">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 rounded-t-lg">
          <h2 className="text-lg font-semibold text-gray-800">Complete RCA Details</h2>
          <p className="text-sm text-gray-500 mt-1">Please provide cause analysis details before marking as complete</p>
        </div>

        <div className="p-6">
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Cause Analysis</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Direct Cause Group <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="rcaDirectCauseGroup"
                    value={formData.rcaDirectCauseGroup}
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

                {formData.rcaDirectCauseGroup && selectedSubGroups.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Direct Cause Sub Group <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="rcaDirectCauseSubGroup"
                      value={formData.rcaDirectCauseSubGroup}
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Root Cause <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="rcaIdentifyDirectCause"
                    value={formData.rcaIdentifyDirectCause}
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

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 bg-white rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#cb4154] text-white rounded-md hover:bg-[#800000]"
              >
                Complete RCA
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RCACompletionModal;
