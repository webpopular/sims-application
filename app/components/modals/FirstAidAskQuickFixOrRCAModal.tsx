//app/components/modals/FirstAidAskQuickFixOrRCAModal.tsx

'use client';
import React from 'react';

interface FirstAidAskQuickFixOrRCAModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQuickFix: () => void;
  onFullRCA: () => void;
}

const FirstAidAskQuickFixOrRCAModal = ({
  isOpen,
  onClose,
  onQuickFix,
  onFullRCA,
}: FirstAidAskQuickFixOrRCAModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg max-w-lg w-full shadow-lg">
        <h2 className="text-lg font-bold mb-4 text-center">
          Does this First Aid Incident Require a Full Root Cause Analysis (RCA)?
        </h2>
        <div className="flex justify-center gap-6 mt-4">
          <button
            onClick={onQuickFix}
            className="px-6 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
          >
            Quick RCA
          </button>
          <button
            onClick={onFullRCA}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Full RCA
          </button>
        </div>
      </div>
    </div>
  );
};

export default FirstAidAskQuickFixOrRCAModal;
