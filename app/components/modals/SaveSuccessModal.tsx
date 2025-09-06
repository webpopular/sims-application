//app/components/models/SaveSuccessModal.tsx
'use client';

export default function SaveSuccessModal({ 
  isOpen, 
  onClose,
  message = "Your changes have been successfully saved." // Add default value
}: { 
  isOpen: boolean; 
  onClose: () => void;
  message?: string; // Add message to the type definition as optional
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
      <div className="bg-white p-4 rounded-lg shadow-md max-w-sm w-full text-center">
        <h2 className="text-lg font-semibold text-gray-800">Changes Saved!</h2>
        <p className="text-gray-600 text-sm">{message}</p>
        <button
          onClick={onClose}  
          className="mt-4 px-4 py-2 bg-[#b22222] text-white rounded hover:bg-[#800000] focus:outline-none"
        >
          OK
        </button>
      </div>
    </div>
  );
}
