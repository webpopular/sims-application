// app/components/modals/InjuryReportModal.tsx
'use client';
import { useState, useEffect } from 'react';

interface InjuryReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFormSelect: (formType: 'US' | 'Global') => void;
}

export default function InjuryReportModal({ 
  isOpen, 
  onClose,
  onFormSelect 
}: InjuryReportModalProps) {
  const [step, setStep] = useState<'initial' | 'formSelect' | 'note'>('initial');
  const [selectedForm, setSelectedForm] = useState<'US' | 'Global' | null>(null);

  // Debugging useEffect for props changes
  useEffect(() => {
    console.log('[Modal] Props updated:', {
      isOpen,
      onClose: typeof onClose,
      onFormSelect: typeof onFormSelect
    });
  }, [isOpen, onClose, onFormSelect]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      console.log('[Modal] Resetting state due to closure');
      setStep('initial');
      setSelectedForm(null);
    }
  }, [isOpen]);

  const handleFormSelect = (type: 'US' | 'Global') => {
    console.log('[Modal] Form type selected:', type);
    setSelectedForm(type);
    setStep('note');
  };

  const handleContinue = () => {
    console.log('[Modal] Continue button clicked');
    
    if (!selectedForm) {
      console.error('[Modal] Error: No form type selected');
      return;
    }

    if (typeof onFormSelect !== 'function') {
      console.error('[Modal] Error: onFormSelect is not a function', {
        onFormSelect,
        selectedForm
      });
      return;
    }

    try {
      console.log('[Modal] Calling onFormSelect with:', selectedForm);
      onFormSelect(selectedForm);
      console.log('[Modal] Closing modal after form selection');
      onClose();
    } catch (error) {
      console.error('[Modal] Error in handleContinue:', error);
    }
  };



  

  const renderStep = () => {
    console.log('[Modal] Rendering step:', step);
    
    switch (step) {
      case 'initial':
        return (
          <div className="flex flex-col items-center gap-6">
            <h2 className="text-xl">Report new injury?</h2>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  console.log('[Modal] Yes button clicked');
                  setStep('formSelect');
                }}
                className="modal-button-primary"
              >
                Yes
              </button>
              <button
                onClick={() => {
                  console.log('[Modal] No button clicked');
                  onClose();
                }}
                className="modal-button-secondary"
              >
                No
              </button>
            </div>
          </div>
        );

      case 'formSelect':
        return (
          <div className="flex flex-col items-center gap-6">
            <h2 className="text-xl">Select Form Type</h2>
            <div className="flex gap-4">
              <button
                onClick={() => handleFormSelect('Global')}
                className="modal-button-primary"
              >
                Global
              </button>
              <button
                onClick={() => handleFormSelect('US')}
                className="modal-button-primary"
              >
                US
              </button>
              <button
                onClick={() => {
                  console.log('[Modal] Cancel button clicked');
                  onClose();
                }}
                className="modal-button-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        );

      case 'note':
        return (
          <div className="flex flex-col items-center gap-6">
            <h2 className="text-xl font-bold">NOTE</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Start and finish this form with the facts known today.</li>
              <li>The safety team can update this report after you submit it.</li>
            </ul>
            <div className="flex gap-4 mt-4">
              <button
                onClick={handleContinue}
                className="modal-button-primary"
              >
                Continue to Form
              </button>
              <button
                onClick={() => {
                  console.log('[Modal] Cancel button clicked from note step');
                  onClose();
                }}
                className="modal-button-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        );
    }
  };

  if (!isOpen) {
    console.log('[Modal] Not rendering because isOpen is false');
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-500 bg-opacity-75 transition-opacity">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-xl">
          <div className="p-6">
            {renderStep()}
          </div>
        </div>
      </div>
    </div>
  );
}
