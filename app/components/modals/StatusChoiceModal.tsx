// components/modals/StatusChoiceModal.tsx
import { useState } from 'react';

interface StatusChoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChoice: (choice: 'obsResolved' | 'obsquickFix' | 'obsNeedsAction') => void;
}

export default function StatusChoiceModal({
  isOpen,
  onClose,
  onChoice,
}: StatusChoiceModalProps) {
  const [selectedChoice, setSelectedChoice] = useState<'obsResolved' | 'obsquickFix' | 'obsNeedsAction' | null>(null);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (selectedChoice) {
      onChoice(selectedChoice);
    }
  };

  const handleRadioChange = (choice: 'obsResolved' | 'obsquickFix' | 'obsNeedsAction') => {
    setSelectedChoice(choice);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex justify-center items-center px-4">
      <div className="bg-white rounded-lg max-w-xl w-full p-6 shadow-xl">
        <h2 className="text-l font-semibold mb-6 text-center text-[#b22222]">
          Please Verify Observation Status
        </h2>

        <div className="space-y-5">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="radio"
              name="statusOption"
              className="mt-1 accent-[#b22222]"
              checked={selectedChoice === 'obsResolved'}
              onChange={() => handleRadioChange('obsResolved')}
            />
            <span className="text-sm text-gray-800 leading-snug">
              <strong>Resolved Immediately:</strong> This issue was resolved on the spot and is now closed. No further action in SIMS is needed.
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="radio"
              name="statusOption"
              className="mt-1 accent-[#b22222]"
              checked={selectedChoice === 'obsquickFix'}
              onChange={() => handleRadioChange('obsquickFix')}
            />
            <span className="text-sm text-gray-800 leading-snug">
              <strong>Quick Fix:</strong> This is a minor issue that remains open. Root Cause Analysis (RCA) is not required.
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="radio"
              name="statusOption"
              className="mt-1 accent-[#b22222]"
              checked={selectedChoice === 'obsNeedsAction'}
              onChange={() => handleRadioChange('obsNeedsAction')}
            />
            <span className="text-sm text-gray-800 leading-snug">
              <strong>Needs Action:</strong> This issue is complex and unresolved. Additional action via SIMS and/or Safety Leader follow-up is needed.
            </span>
          </label>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            className="modal-button-secondary"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="modal-button-primary"
            onClick={handleSubmit}
            disabled={!selectedChoice}
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}
