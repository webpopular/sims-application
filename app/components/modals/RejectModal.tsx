
// app/components/modals/RejectModal.tsx
import { useState } from "react";

interface RejectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReject: (reason: string) => Promise<void>;
  reportId: string;
}

export default function RejectModal({ isOpen, onClose, onReject, reportId }: RejectModalProps) {
  //const [rejectReason, setRejectReason] = useState<string>('duplicate');
  const [selectedReason, setSelectedReason] = useState('');
  const [otherReason, setOtherReason] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">Why event was this rejected?</h2>

        <div className="space-y-4">
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="radio"
              name="rejectReason"
              value="duplicate"  // Changed from "Duplicate"
              checked={selectedReason === 'duplicate'}
              onChange={(e) => setSelectedReason(e.target.value)}
              className="form-radio"
            />
            <span>This issue was already reported (duplicate in SIMS)</span>
          </label>

          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="radio"
              name="rejectReason"
              value="inaccurate"  // Changed from "Inaccurate"
              checked={selectedReason === 'inaccurate'}
              onChange={(e) => setSelectedReason(e.target.value)}
              className="form-radio"
            />
            <span>Inaccurate report</span>
          </label>

          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="radio"
              name="rejectReason"
              value="other"
              checked={selectedReason === 'other'}
              onChange={(e) => setSelectedReason(e.target.value)}
              className="form-radio"
            />
            <span>Other. Please specify</span>
          </label>

          {selectedReason === 'other' && (
            <textarea
              value={otherReason}
              onChange={(e) => setOtherReason(e.target.value)}
              className="w-full mt-2 p-2 border rounded"
              placeholder="Enter reason..."
            />
          )}
        </div>

        <div className="flex justify-end gap-4 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 rounded"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              const reason = selectedReason === 'other' ? otherReason : selectedReason;
              onReject(reason);
            }}
            className="px-4 py-2 bg-red-600 text-white rounded"
            disabled={!selectedReason || (selectedReason === 'other' && !otherReason)}
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  );

}
