///app/components/modals/DocumentsModal.tsx

'use client';

import React from "react";
import DocumentsSection from "../forms/sections/Documents";
import type { Document } from "@/app/types";

interface DocumentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  submissionId: string;
  existingDocuments?: Document[];
  onSave: (sectionName: string, docs: Document[]) => void;
}

export default function DocumentsModal({
  isOpen,
  onClose,
  submissionId,
  existingDocuments = [],
  onSave,
}: DocumentsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
      <div className="bg-white p-4 rounded-lg shadow-md max-w-3xl w-full text-center">
        <h2 className="text-lg font-semibold text-gray-800 mb-2">Upload Documents</h2>
        <DocumentsSection
          isExpanded={true}
          onToggle={() => {}}
          onSave={onSave}
          submissionId={submissionId}
          existingDocuments={existingDocuments}
        />
        <div className="flex justify-center gap-4 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 focus:outline-none"
          >
            Cancel
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#b22222] text-white rounded hover:bg-[#800000] focus:outline-none"
          >
            Done
          </button>
        </div>
        <div className="mt-3 text-xs text-gray-500">
          Don&apos;t have document(s) to upload? Click Cancel or Done.
        </div>
      </div>
    </div>
  );
}
