//app/components/forms/sections/Classification.tsx
'use client';

import { ChevronDown, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import { getCurrentUser } from "aws-amplify/auth";
import { generateClient } from "aws-amplify/data";
import { type Schema } from "@/amplify/data/schema";
import EmailNotification from "../notifications/EmailNotification";
import { useRouter } from "next/navigation";
import { useSearchParams } from 'next/navigation';  


const client = generateClient<Schema>();

export interface ClassificationProps {
  isExpanded: boolean;
  onToggle: () => void;
  onSave: (sectionName: string, data: any) => void;
  submissionId: string;
  formType?: "US" | "Global";
  id: string;
  status?: string;
  injuryCategory?: string; // ✅ Updated from recordType
  OSHArecordableType?: string;
  caseClassification?: string;
  injuryIllness?: string;
  estimatedLostWorkDays?: number;
}

export default function ClassificationSection({
  isExpanded,
  onToggle,
  onSave,
  submissionId,
  formType,
  id,
  status,
  injuryCategory, // ✅ Pull from injuryCategory
  OSHArecordableType,
  caseClassification,
  injuryIllness,
  estimatedLostWorkDays,
}: ClassificationProps) {
  const router = useRouter();

  const [classification, setClassification] = useState({
    injuryCategory: injuryCategory || "", // ✅ Initialize correctly
    OSHArecordableType: OSHArecordableType || "",
    caseClassification: caseClassification || "",
    injuryIllness: injuryIllness || "",
    estimatedLostWorkDays: estimatedLostWorkDays || 0,
  });

  const searchParams = useSearchParams();
  const urlFormType = searchParams.get("formType");
  const effectiveFormType = urlFormType === "Global" ? "Global" : 
                                            urlFormType === "US" ? "US" : 
                                            formType || "US";

  const [user, setUser] = useState<any>(null);
  const [showEmailNotificationModal, setShowEmailNotificationModal] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    console.log('Classification section formType received:', formType); //WRONG
    console.log('Classification section urlFormType received:', urlFormType); //CORRECT
    console.log('✅ Classification section formType resolved:', effectiveFormType); //CORRECT
  }, [formType]);


    // Detailed logging for debugging
    useEffect(() => {
      console.log('Classification component - formType details:', {
        propFormType: formType,  //WRONG
        urlFormType,//CORRECT
        effectiveFormType,//CORRECT
        conditionalResult: effectiveFormType === "US"
      });
    }, [formType, urlFormType, effectiveFormType]);


  useEffect(() => {
    console.log('✅ Classification section formType received123:', formType); // Should now print Global or US properly
  }, [formType]);

  

  // 🔹 Fetch current user
  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    };
    fetchUser();
  }, []);

  // 🔹 Initialize classification state when props change
  useEffect(() => {
    setClassification({
      injuryCategory: injuryCategory || "",
      OSHArecordableType: OSHArecordableType || "",
      caseClassification: caseClassification || "",
      injuryIllness: injuryIllness || "",
      estimatedLostWorkDays: estimatedLostWorkDays || 0,
    });
  }, [injuryCategory, OSHArecordableType, caseClassification, injuryIllness, estimatedLostWorkDays]);

  // 🔹 Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    setClassification((prev) => {
      const updated = {
        ...prev,
        [name]: value,
      };

      // ✅ If user changes injuryCategory and it's no longer LTA, reset estimatedLostWorkDays
      if (name === "injuryCategory" && value !== "Medically Treated with Lost Time (LTA)") {
        updated.estimatedLostWorkDays = 0;
      }

      return updated;
    });
  };


  // 🔹 Save & Notify functionality (with detailed logging)
  const handleSaveAndNotify = async () => {
    try {
      const user = await getCurrentUser();

      const updateFields = {
        id,
        submissionId,
        recordType: 'INJURY_REPORT', // ✅ Fixed value
        injuryCategory: classification.injuryCategory, // ✅ Use injuryCategory
        //status: 'Pending Review',
        updatedAt: new Date().toISOString(),
        updatedBy: user.username,
        owner: user.username,
        OSHArecordableType: classification.OSHArecordableType,
        caseClassification: classification.caseClassification,
        injuryIllness: classification.injuryIllness,
        estimatedLostWorkDays: classification.estimatedLostWorkDays ?? 0,
      };

      console.log('🚀 Submitting classification updateFields:', updateFields);

      const response = await client.models.Submission.update(updateFields);

      console.log('✅ Update Response:', response);

      onSave('classification', updateFields);


      // ✅ Update local state after save to reflect latest data
      setClassification({
        injuryCategory: updateFields.injuryCategory || "",
        OSHArecordableType: updateFields.OSHArecordableType || "",
        caseClassification: updateFields.caseClassification || "",
        injuryIllness: updateFields.injuryIllness || "",
        estimatedLostWorkDays: updateFields.estimatedLostWorkDays ?? 0,
      });

      // ✅ Trigger parent to refresh data
      //onSave('classification', updateFields);  

      setShowEmailNotificationModal(true);
      setIsEmailSent(false);
    } catch (error) {
      console.error('❌ Error saving classification:', error);
    }
  };

  // 🔹 Handles closing the email modal
  const handleEmailSuccess = () => {
    setShowEmailNotificationModal(false);
    setIsEmailSent(true);
  };



  return (
    <div className="border-b">
      {/* 🔹 Section Header */}
      <button
        onClick={onToggle}
        className={`w-full flex justify-between items-center px-4 py-3 text-sm font-medium transition-all duration-200 border-b border-gray-200 last:border-b-0
          ${isExpanded ? "bg-red-50" : "bg-white"}
          hover:bg-red-200 hover:text-sm rounded-md`}
      >
        <div className="flex items-center">
          {isExpanded ? <ChevronDown className="h-5 w-5 mr-2" /> : <ChevronRight className="h-5 w-5 mr-2" />}
          <span>Classification</span>
        </div>

        <span className="text-xs font-medium px-2 py-1 rounded-md bg-amber-200 text-gray-700">
          {classification.injuryCategory
            ? classification.injuryCategory === "Medically Treated with Lost Time (LTA)" && classification.estimatedLostWorkDays
              ? `${classification.injuryCategory} (${classification.estimatedLostWorkDays} days)`
              : classification.injuryCategory
            : "Not Classified"}
        </span>

      </button>

      {isExpanded && (
        <div className="p-4 bg-white shadow-sm rounded-b-md">
          <h2 className="text-lg font-medium">Classify the Injury</h2>

          {/* 🔹 Injury Type Selection */}
          <div className="space-y-4 mt-4">
            {["First Aid", "Medically Treated Incident (MTI)", "Medically Treated with Lost Time (LTA)"].map((type) => (
              <label key={type} className="flex items-center space-x-3">
                <input
                  type="radio"
                  name="injuryCategory" // ✅ Updated name
                  value={type}
                  checked={classification.injuryCategory === type} // ✅ Updated check
                  onChange={handleInputChange}
                  className="form-radio"
                />
                <span>{type}</span>
              </label>
            ))}
          </div>

          {/* 🔹 Lost Work Days */}
          {classification.injuryCategory === "Medically Treated with Lost Time (LTA)" && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <span className="inline-block mr-2">Estimated Lost Work Days:</span>
                <input
                  type="number"
                  name="estimatedLostWorkDays"
                  value={classification.estimatedLostWorkDays}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (/^\d*$/.test(value)) {
                      setClassification((prev) => ({
                        ...prev,
                        estimatedLostWorkDays: Number(value),
                      }));
                      setError(""); // ✅ Clear error
                    } else {
                      setError("Please enter a valid positive whole number.");
                    }
                  }}
                  step="1"
                  min="0"
                  className="border border-gray-300 rounded-md px-2 py-1 w-24 inline-block focus:border-[#cb4154] focus:ring-0 focus:outline-none font-bold text-gray-800"
                  placeholder="0"
                />

              </label>

              {/*  Inline Error */}
              {error && (
                <p className="text-red-600 text-sm mt-1">{error}</p>
              )}
            </div>
          )}



          {/* 🔹 OSHA Classification (For US Only) */}
          {effectiveFormType === "US" && (
            <div className="mt-6 border-t pt-6">
              <h3 className="text-xl font-bold mb-4">OSHA Classification (US Only)</h3>

              {/* OSHA Recordable */}
              <div className="space-y-3 mb-6">
                {["Not OSHA Recordable", "Is an OSHA Recordable"].map((type) => (
                  <label key={type} className="flex items-center space-x-3">
                    <input
                      type="radio"
                      name="OSHArecordableType"
                      value={type}
                      checked={classification.OSHArecordableType === type}
                      onChange={handleInputChange}
                      className="form-radio"
                    />
                    <span>{type}</span>
                  </label>
                ))}
              </div>

              {/* ✅ Show Case Classification + Injury/Illness if OSHA Recordable is selected */}
              {classification.OSHArecordableType === "Is an OSHA Recordable" && (
                <div className="grid grid-cols-2 gap-6">
                  {/* Case Classification */}
                  <div>
                    <h4 className="font-medium mb-3">Case Classification</h4>
                    <div className="space-y-3">
                      {[
                        "Death",
                        "Days Away From Work",
                        "Job Transfer or Restriction",
                        "Other Recordable Case",
                      ].map((type) => (
                        <label key={type} className="flex items-center space-x-3">
                          <input
                            type="radio"
                            name="caseClassification"
                            value={type}
                            checked={classification.caseClassification === type}
                            onChange={handleInputChange}
                            className="form-radio"
                          />
                          <span>{type}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Injury/Illness */}
                  <div>
                    <h4 className="font-medium mb-3">Injury/Illness</h4>
                    <div className="space-y-3">
                      {[
                        "Injury - All Types",
                        "Illness - Skin Disorder",
                        "Illness - Respiratory",
                        "Illness - Poisoning",
                        "Illness - Hearing Loss",
                        "Illness - All Other Illnesses",
                      ].map((type) => (
                        <label key={type} className="flex items-center space-x-3">
                          <input
                            type="radio"
                            name="injuryIllness"
                            value={type}
                            checked={classification.injuryIllness === type}
                            onChange={handleInputChange}
                            className="form-radio"
                          />
                          <span>{type}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}





          {/* 🔹 Action Buttons */}
          <div className="flex justify-end gap-4 mt-6">
            <button onClick={onToggle} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">
              Cancel
            </button>
            <button
              onClick={handleSaveAndNotify}
              //className="px-4 py-2 bg-[#cb4154] text-white rounded hover:bg-[#800000]"
              className="modal-button-primary"
              disabled={!classification.injuryCategory || (classification.injuryCategory === "Medically Treated with Lost Time (LTA)" && !classification.estimatedLostWorkDays)}
            >
              Save & Notify
            </button>
          </div>
        </div>
      )}

      {/* ✅ Email Notification Modal */}
      <EmailNotification
        isOpen={showEmailNotificationModal}
        onClose={() => setShowEmailNotificationModal(false)}
        onSuccess={handleEmailSuccess}
        reportId={submissionId}
        title="Classification Update Notification"
      />
    </div>
  );
}

