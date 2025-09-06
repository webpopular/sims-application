//app/components/modals/ClassificationModal.tsx

'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "aws-amplify/auth";
import { generateClient } from "aws-amplify/data";
import EmailNotification from "../forms/notifications/EmailNotification";
import { type Schema } from "@/amplify/data/schema";
import FirstAidAskQuickFixOrRCAModal from './FirstAidAskQuickFixOrRCAModal';
import FirstAidQuickFixModal from './FirstAidQuickFixModal';


const client = generateClient<Schema>();

interface ClassificationModalProps {
    isOpen: boolean;
    onClose: () => void;
    submissionId: string;
    formType: "US" | "Global";
    initialData?: any;  // Optional, pass only if needed
}

export default function ClassificationModal({
    isOpen,
    onClose,
    submissionId,
    formType,
    initialData
}: ClassificationModalProps) {
    const router = useRouter();

    // 🔹 State for Injury Classification
    const [selectedInjuryType, setSelectedInjuryType] = useState("");
    const [estimatedLostDays, setEstimatedLostDays] = useState("");

    // 🔹 State for OSHA Classification (if US)
    const [selectedOSHAClass, setSelectedOSHAClass] = useState({
        OSHArecordableType: "",
        caseClassification: "",
        injuryIllness: ""
    });

    // 🔹 State for Notification Modal
    const [showEmailNotificationModal, setShowEmailNotificationModal] = useState(false);
    const [showFinalChoiceModal, setShowFinalChoiceModal] = useState(false);

    const [error, setError] = useState<string>("");
    const [showFirstAidChoiceModal, setShowFirstAidChoiceModal] = useState(false);
    const [showQuickFixModal, setShowQuickFixModal] = useState(false);



    console.log('ClassificationModal formType //app/components/modals/ClassificationModal.tsx:', formType);


    // ✅ Initialize state when initialData is available
    useEffect(() => {
        if (initialData) {
            setSelectedInjuryType(initialData.injuryCategory || "");
            setEstimatedLostDays(initialData.estimatedLostWorkDays?.toString() || "");

            setSelectedOSHAClass({
                OSHArecordableType: initialData.OSHArecordableType || "",
                caseClassification: initialData.caseClassification || "",
                injuryIllness: initialData.injuryIllness || ""
            });
        }
    }, [initialData]);



    // ✅ Handles saving classification & sending notification
    const handleSaveClassification = async () => {
        try {
            const user = await getCurrentUser();

            // 🔹 Fetch existing submission record (to get `id`)
            const existingSubmission = await client.models.Submission.list({
                filter: { submissionId: { eq: submissionId } }
            });

            if (!existingSubmission.data.length) {
                console.error("❌ Error: No matching submission found for submissionId:", submissionId);
                return;
            }

            // 🔹 Extract ID of submission
            const submissionToUpdate = existingSubmission.data[0];

            // 🔹 Prepare update fields
            const updateFields = {
                id: submissionToUpdate.id,
                submissionId,
                //recordType: selectedInjuryType,
                recordType: "INJURY_REPORT", // ✅ System record type (keep fixed)
                status: "Pending Review", // Default status after classification
                updatedAt: new Date().toISOString(),
                updatedBy: user.username,
                owner: user.username,
                injuryCategory: selectedInjuryType, // ✅ Correct field for classification 
                OSHArecordableType: selectedOSHAClass.OSHArecordableType,
                caseClassification: selectedOSHAClass.caseClassification,
                injuryIllness: selectedOSHAClass.injuryIllness,
                estimatedLostWorkDays: selectedInjuryType === "Medically Treated with Lost Time (LTA)"
                    ? parseInt(estimatedLostDays || "0")
                    : undefined
            };
            console.log("🚀 Submitting classification updateFields:", updateFields);

            // 🔹 Update submission
            const response = await client.models.Submission.update(updateFields);
            console.log("✅ Update Response:", response);

            // ✅ Open Email Notification Modal
            setShowEmailNotificationModal(true);
        } catch (error) {
            console.error("Error saving classification:", error);
        }
    };

    // Handles closing email notification modal & opening final choice modal
// In handleEmailSuccess function
const handleEmailSuccess = () => {
    setShowEmailNotificationModal(false);
    
    // If we came from Quick Fix, we don't need to show the final choice modal
    if (selectedInjuryType === "First Aid" && !showFinalChoiceModal) {
      onClose(); // Close the parent Classification modal
      //router.push("/first-reports/injury"); // Redirect to the InjuryList page
      router.push("/view/incidents"); // Redirect to the Open and Closed view

      
    } else {
      setShowFinalChoiceModal(true);
    }
  };
  

    // Handles final decision: RCA later OR RCA now
    const handleFinalChoice = async (startRCA: boolean) => {
        try {
            const user = await getCurrentUser();

            if (startRCA) {
                console.log("Starting RCA Process...");

                // ✅ Fetch existing submission record (to ensure ID is available)
                const existingSubmission = await client.models.Submission.list({
                    filter: { submissionId: { eq: submissionId } }
                });

                if (!existingSubmission.data.length) {
                    console.error("❌ Error: No matching submission found for submissionId:", submissionId);
                    return;
                }

                const submissionToUpdate = existingSubmission.data[0];

                // ✅ Update the status
                const updatedResponse = await client.models.Submission.update({
                    id: submissionToUpdate.id,  // Ensure we're updating the correct record
                    status: "Incident with RCA - Open",
                    updatedAt: new Date().toISOString(),
                    updatedBy: user.username,
                });

                // ✅ Confirm the update went through
                if (!updatedResponse.data) {
                    console.error("❌ Error: Status update failed.");
                    return;
                }

                console.log("✅ Status updated successfully:", updatedResponse.data.status);

                // ✅ Add a short delay to allow the UI to refresh properly
                setTimeout(() => {
                    router.push("/incident-investigations");
                }, 800); // Adjust delay if needed
            } else {
                console.log("Completing RCA Process Later...");
                setShowFinalChoiceModal(false);
                setShowFinalChoiceModal(false);
                onClose(); // Close the parent Classification modal
                router.push("/first-reports/injury"); // Redirect to the InjuryList page                
            }
        } catch (error) {
            console.error("❌ Error updating status:", error);
        }
    };






    return isOpen ? (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-2xl w-full">
                <h2 className="text-xl font-bold mb-6">Please Classify the Injury Record Type and Notify</h2>

                {/* 🔹 Injury Classification */}
                {/* 🔹 Injury Classification */}
                <div className="space-y-4 mb-6">
                    {["First Aid", "Medically Treated Incident (MTI)", "Medically Treated with Lost Time (LTA)"].map((type) => (
                        <label key={type} className="flex items-center space-x-3">
                            <input
                                type="radio"
                                name="injuryType"
                                value={type}
                                checked={selectedInjuryType === type}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setSelectedInjuryType(value);
                                    if (value === "First Aid") {
                                        setShowFirstAidChoiceModal(true);
                                    }
                                }}
                                className="form-radio"
                            />
                            <span>{type}</span>
                        </label>
                    ))}
                </div>


                {/* 🔹 Lost Work Days (if LTA is selected) */}
                {selectedInjuryType === "Medically Treated with Lost Time (LTA)" && (
                    <div className="ml-8 mt-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Estimated Lost Work Days:
                        </label>
                        <input
                            type="number"
                            value={estimatedLostDays}
                            onChange={(e) => {
                                const value = e.target.value;
                                if (/^\d*$/.test(value)) {
                                    setEstimatedLostDays(value);
                                    setError(""); // ✅ clear error
                                } else {
                                    setError("Please enter a valid positive number."); // ✅ set error
                                }
                            }}
                            step="1"
                            min="0"
                            className="border border-gray-300 rounded-md px-2 py-1 w-24 inline-block focus:border-[#cb4154] focus:ring-0 focus:outline-none font-bold text-gray-800"
                            placeholder="0"
                        />

                        {/* ✅ Error message appears here */}
                        {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
                    </div>
                )}



                {/* 🔹 OSHA Classification (For US Only) */}
                {formType === "US" && (
                    <div className="mt-6 border-t pt-6">
                        <h3 className="text-xl font-bold mb-4">OSHA Classification (US Only)</h3>
                        <div className="space-y-3 mb-6">
                            {["Not OSHA Recordable", "Is an OSHA Recordable"].map((type) => (
                                <label key={type} className="flex items-center space-x-3">
                                    <input
                                        type="radio"
                                        name="oshaRecordable"
                                        value={type}
                                        checked={selectedOSHAClass.OSHArecordableType === type}
                                        onChange={(e) =>
                                            setSelectedOSHAClass((prev) => ({
                                                ...prev,
                                                OSHArecordableType: e.target.value,
                                                ...(e.target.value === "Not OSHA Recordable"
                                                    ? { caseClassification: "", injuryIllness: "" }
                                                    : {}),
                                            }))
                                        }
                                        className="form-radio"
                                    />
                                    <span>{type}</span>
                                </label>
                            ))}
                        </div>

                        {/* ✅ Conditionally show Case Classification and Injury/Illness if "Is an OSHA Recordable" is selected */}
                        {selectedOSHAClass.OSHArecordableType === "Is an OSHA Recordable" && (
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
                                                    checked={selectedOSHAClass.caseClassification === type}
                                                    onChange={(e) =>
                                                        setSelectedOSHAClass((prev) => ({
                                                            ...prev,
                                                            caseClassification: e.target.value,
                                                        }))
                                                    }
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
                                                    checked={selectedOSHAClass.injuryIllness === type}
                                                    onChange={(e) =>
                                                        setSelectedOSHAClass((prev) => ({
                                                            ...prev,
                                                            injuryIllness: e.target.value,
                                                        }))
                                                    }
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
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">Go Back</button>
                    <button
                        onClick={handleSaveClassification}
                        //className="px-4 py-2 bg-[#cb4154] text-white rounded hover:bg-[#800000]"
                        className="modal-button-primary"
                    >
                        Save & Notify
                    </button>
                </div>

                {/* ✅ Email Notification Modal */}
                <EmailNotification
                    isOpen={showEmailNotificationModal}
                    onClose={() => setShowEmailNotificationModal(false)}
                    onSuccess={handleEmailSuccess}
                    reportId={submissionId}  // ✅ Pass `submissionId` as `reportId`
                    title="Classification Update Notification"
                />

                {/* ✅ Final Decision Modal */}
                {showFinalChoiceModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white p-6 rounded-lg shadow-lg max-w-2xl w-full">
                            <h2 className="text-xl font-bold mb-8 text-center">Do you wish to?</h2>
                            <div className="flex justify-center gap-8">
                                <button onClick={() => handleFinalChoice(false)} className="px-6 py-4 bg-yellow-500 text-white rounded-md">Complete RCA Later</button>
                                <button onClick={() => handleFinalChoice(true)} className="px-6 py-4 bg-green-600 text-white rounded-md">Work on RCA Process</button>
                            </div>
                        </div>
                    </div>
                )}


                {/* 🔹 First Aid → Quick Fix or RCA Modal */}
                <FirstAidAskQuickFixOrRCAModal
                    isOpen={showFirstAidChoiceModal}
                    onClose={() => setShowFirstAidChoiceModal(false)}
                    onQuickFix={() => {
                        setShowFirstAidChoiceModal(false);
                        setShowQuickFixModal(true);
                    }}
                    onFullRCA={() => {
                        setShowFirstAidChoiceModal(false);
                        setShowFinalChoiceModal(true);
                    }}
                />

 {/* 🔹 Quick Fix Form Modal */}
<FirstAidQuickFixModal
  isOpen={showQuickFixModal}
  onClose={() => setShowQuickFixModal(false)}
  submissionId={submissionId}
  onSuccess={() => {
    setShowQuickFixModal(false);
    setShowEmailNotificationModal(true);
  }}
/>




            </div>
        </div>
    ) : null;
}
