
// app/components/sections/FinalCorrectiveActionsSection.tsx

'use client';
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  forwardRef,
  useState,
  useImperativeHandle,
  useEffect,
  ForwardRefRenderFunction,
} from "react";
import { v4 as uuidv4 } from "uuid";
import { getCurrentUser } from "aws-amplify/auth";
import type { FinalCorrectiveAction } from "@/app/types";
import { getUserInfo } from "@/lib/utils/getUserInfo";
import { generateFinalCorrectiveActionEmail } from "@/app/utils/emailTemplates/finalCorrectiveActionEmail";
import { sendEmail } from "@/app/utils/aws/ses";
import { fetchSubmissionData } from "@/app/api/fetchSubmissionData";
import toast from 'react-hot-toast';
import { Toaster } from 'react-hot-toast';


// Expose a handle so that the parent component can call getData()
export interface FinalCorrectiveActionsSectionHandle {
  getData: () => FinalCorrectiveAction[];
}

// Status labels mapping for better readability
const statusLabels: Record<FinalCorrectiveAction["fcaStatus"], string> = {
  "YET_TO_BEGIN": "Yet to Begin",
  "ACTION_IN_PROGRESS": "Action In Progress",
  "ACTION_COMPLETE": "Action Complete",
};

const getStatusLabel = (status: FinalCorrectiveAction["fcaStatus"]) =>
  statusLabels[status] || "Unknown"; // Fallback for unknown statuses

interface FinalCorrectiveActionsSectionProps {
  isExpanded: boolean;
  onToggle: () => void;
  onSave: (sectionName: string, finalActions: FinalCorrectiveAction[]) => void;
  submissionId: string;
  existingActions: FinalCorrectiveAction[];
}

const FinalCorrectiveActionsSection: ForwardRefRenderFunction<
  FinalCorrectiveActionsSectionHandle,
  FinalCorrectiveActionsSectionProps
> = (
  { isExpanded, onToggle, onSave, submissionId, existingActions = [] },
  ref
) => {
    // Local state for FCA list and new/edited action
    const [finalActions, setFinalActions] = useState<FinalCorrectiveAction[]>(existingActions);
    const [newAction, setNewAction] = useState<FinalCorrectiveAction>(() => ({
      fcaId: uuidv4(),
      dueDate: "",
      assignedTo: "",
      fcaStatus: "YET_TO_BEGIN", // Changed from "ACTION_IN_PROGRESS" to "YET_TO_BEGIN"
      actionDescription: "",
      actionNotes: "",
      uploadedAt: "",
      uploadedBy: "",
    }));
    const [editingAction, setEditingAction] = useState<string | null>(null);
    const [user, setUser] = useState<any>(null);
    const [showNotesRequiredModal, setShowNotesRequiredModal] = useState(false);
    const [emailError, setEmailError] = useState<string>("");

    // Fetch user details
    useEffect(() => {
      const fetchUser = async () => {
        const currentUser = await getCurrentUser();
        console.log("[FCA] Current user:", currentUser);
        setUser(currentUser);
      };
      fetchUser();
    }, []);

    // Update local state when existing actions change
    useEffect(() => {
      console.log("[FCA] Received existing actions:", existingActions);
      if (existingActions?.length > 0) {
        // Log each action's status
        existingActions.forEach(action => {
          console.log(`Action ${action.fcaId} status:`, action.fcaStatus);
        });
        setFinalActions(existingActions);
      }
    }, [existingActions]);

    // Expose getData() to parent
    useImperativeHandle(ref, () => ({
      getData: () => finalActions,
    }));

    // Handle input changes
// Handle input changes
const handleNewActionInputChange = (
  e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
) => {
  const { name, value } = e.target;

  // Email validation for assignedTo field
  if (name === "assignedTo") {
    if (value && !isValidEmail(value)) {
      setEmailError("Please enter a valid email address");
    } else {
      setEmailError("");
    }
  }

  // Validate notes if setting to ACTION_COMPLETE
  if (name === "fcaStatus" && value === "ACTION_COMPLETE" && !(newAction.actionNotes ?? '').trim()) {
    setShowNotesRequiredModal(true);
    return; // Block setting status until notes are filled
  }

  setNewAction((prev: FinalCorrectiveAction) => ({
    ...prev,
    [name]: value,
    uploadedAt: new Date().toISOString(),
    uploadedBy: user?.username || "",
  }));
};



 // Email validation helper function
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};
    // Save action (Add new or update existing)
// Save action (Add new or update existing)
const handleSaveAction = async () => {
  // Validate email before saving
  if (newAction.assignedTo && !isValidEmail(newAction.assignedTo)) {
    setEmailError("Please enter a valid email address");
    toast(`Please enter a valid email address`, {
      icon: '❌'
    });
    return; // Prevent saving
  }

  let updatedActions: FinalCorrectiveAction[];
  let isUpdate = false;

  if (editingAction) {
    // Update existing action
    updatedActions = finalActions.map((action: FinalCorrectiveAction) =>
      action.fcaId === editingAction ? { ...newAction, fcaId: editingAction } : action
    );
    console.log("[FCA] Action updated:", newAction);
    setEditingAction(null);
    isUpdate = true;
  } else {
    // Add new action
    const actionToAdd = { ...newAction, fcaId: uuidv4() };
    updatedActions = [...finalActions, actionToAdd];
    console.log("[FCA] New action added:", actionToAdd);
  }

  // Update state and save to parent
  setFinalActions(updatedActions);
  await onSave("finalCorrectiveActions", updatedActions);
  
  // Show success toast
  toast(`Action ${isUpdate ? 'updated' : 'added'} successfully`, {
    icon: '✅'
  });
  
  // Send email notification if there's an assignee email
  if (newAction.assignedTo && newAction.assignedTo.includes('@')) {
    try {
      const userInfo = await getUserInfo();
      const senderName = userInfo.name !== "Unknown" ? userInfo.name : userInfo.username;
      const senderEmail = userInfo.email || "";
      
      // Fetch the full submission data to include in the email
      const submissionData = await fetchSubmissionData(submissionId);
      
      // Generate email content using the template
      const emailContent = generateFinalCorrectiveActionEmail(
        newAction, 
        submissionData, 
        senderName,
        senderEmail,
        isUpdate
      );
      
      // Send the email and check the response
      const emailResult = await sendEmail(
        [newAction.assignedTo], 
        `[SIMS] Final Corrective Action ${submissionId}`,
        emailContent
      );
      
      if (emailResult && typeof emailResult === 'object' && emailResult.success) {
        console.log(`[FCA] Email notification sent to ${newAction.assignedTo}`);
        toast(`Email notification sent to ${newAction.assignedTo}`, {
          icon: '✅'
        });
      } else {
        console.warn(`[FCA] Email notification could not be delivered to ${newAction.assignedTo}`);
        toast(`Email notification could not be sent to ${newAction.assignedTo}. The action was saved.`, {
          icon: '⚠️'
        });
      }
    } catch (error) {
      console.error("[FCA] Error sending email notification:", error);
      toast(`Failed to send email notification, but action was saved`, {
        icon: '❌'
      });
    }
  }

  // Reset form
  resetNewAction();
  
  // Clear any validation errors
  setEmailError("");
};






    // Edit an existing action
    const handleEditAction = (fcaId: string) => {
      const actionToEdit = finalActions.find(
        (action: FinalCorrectiveAction) => action.fcaId === fcaId
      );
      if (actionToEdit) {
        setNewAction(actionToEdit);
        setEditingAction(fcaId);
        console.log("[FCA] Editing action:", actionToEdit);
      }
    };

    // Remove an action
    const handleRemoveAction = (fcaId: string) => {
      const updatedActions = finalActions.filter(
        (action: FinalCorrectiveAction) => action.fcaId !== fcaId
      );
      setFinalActions(updatedActions);
      onSave("finalCorrectiveActions", updatedActions);
      console.log("[FCA] Action removed, fcaId:", fcaId);
    };

    // Reset form
    const resetNewAction = () => {
      setNewAction({
        fcaId: uuidv4(),
        dueDate: "",
        assignedTo: "",
        fcaStatus: "YET_TO_BEGIN", // Changed from "ACTION_IN_PROGRESS" to "YET_TO_BEGIN"
        actionDescription: "",
        actionNotes: "",
        uploadedAt: "",
        uploadedBy: "",
      });
    };

    const getOverallStatus = () => {
      if (!finalActions.length) return { text: "Not Created", items: [] };

      const yetToBeginCount = finalActions.filter(action => action.fcaStatus === "YET_TO_BEGIN").length;
      const inProgressCount = finalActions.filter(action => action.fcaStatus === "ACTION_IN_PROGRESS").length;
      const completedCount = finalActions.filter(action => action.fcaStatus === "ACTION_COMPLETE").length;

      let statusItems = [];

      if (yetToBeginCount > 0) {
        statusItems.push({
          text: `Yet to Begin (${yetToBeginCount})`,
          color: "bg-gray-100 text-gray-800"
        });
      }

      if (inProgressCount > 0) {
        statusItems.push({
          text: `In Progress (${inProgressCount})`,
          color: "bg-blue-100 text-blue-800"
        });
      }

      if (completedCount > 0) {
        statusItems.push({
          text: `Completed (${completedCount})`,
          color: "bg-green-100 text-green-800"
        });
      }

      return {
        text: statusItems.map(item => item.text).join(" | ") || "Not Created",
        items: statusItems
      };
    };



    {showNotesRequiredModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-4 rounded-lg shadow-md max-w-sm w-full text-center">
          <h2 className="text-lg font-semibold text-red-600">Action Notes Required</h2>
          <p className="text-sm text-gray-700 mt-2">
            Please enter "Corrective Action Follow Up/Effectiveness Notes" before marking as Complete.
          </p>
          <button
            onClick={() => setShowNotesRequiredModal(false)}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            OK
          </button>
        </div>
      </div>
    )}



    return (
      <div className="border-b">
            <Toaster position="top-right" />

        {showNotesRequiredModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-4 rounded-lg shadow-md max-w-sm w-full text-center">
              <h2 className="text-lg font-semibold text-red-600">Action Notes Required</h2>
              <p className="text-sm text-gray-700 mt-2">
                Please enter "Corrective Action Follow Up/Effectiveness Notes" before marking as Complete.
              </p>
              <button
                onClick={() => setShowNotesRequiredModal(false)}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                OK
              </button>
            </div>
          </div>
        )}
  
        <button
          onClick={(e) => {
            e.preventDefault();
            onToggle();
          }}
          className={`w-full flex justify-between items-center px-4 py-3 text-sm font-medium transition-all duration-200 border-b border-gray-200 last:border-b-0
            ${isExpanded ? "bg-red-50" : "bg-white"} 
            hover:bg-red-200 hover:text-sm rounded-md`}
        >
          <div className="flex items-center">
            {isExpanded ? <ChevronDown className="h-5 w-5 mr-2" /> : <ChevronRight className="h-5 w-5 mr-2" />}
            <span>Final Corrective Actions</span>
            <span className="ml-2 text-xs text-gray-500">({finalActions.length} actions)</span>
          </div>
          <div className="flex items-center space-x-2">
            {getOverallStatus().items && getOverallStatus().items.length > 0 ? (
              getOverallStatus().items.map((item, index) => (
                <span key={index} className={`text-xs px-2 py-0.5 rounded-full ${item.color}`}>
                  {item.text}
                </span>
              ))
            ) : (
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100">
                Not Created
              </span>
            )}
          </div>
        </button>
  
        {isExpanded && (
          <div className="p-4">
            {/* New/Edit Action Form */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200 mb-6">
              <div className="bg-slate-50 px-4 py-3 border-b border-gray-200">
                <h2 className="text-sm font-semibold text-gray-600">
                  {editingAction ? "Edit Action" : "Add New Action"}
                </h2>
              </div>
              
              <div className="p-6 space-y-4">
                {/* Form fields in a grid layout */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  {/* Due Date */}
                  <div className="space-y-1">
                    <label className="block text-gray-700 text-xs uppercase tracking-wider font-bold">
                      Due Date
                    </label>
                    <input
                      type="date"
                      name="dueDate"
                      className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                      value={newAction.dueDate}
                      onChange={handleNewActionInputChange}
                    />
                  </div>
                  
                 {/* Assigned To */}
                 <div className="space-y-1">
  <label className="block text-gray-700 text-xs uppercase tracking-wider font-bold">
    Assigned To (Email)
  </label>
  <input
    type="email"
    name="assignedTo"
    className={`w-full p-2 border ${emailError ? "border-red-500" : "border-gray-300"} rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all`}
    value={newAction.assignedTo}
    onChange={handleNewActionInputChange}
    placeholder="Enter email address"
    required
  />
  {emailError && (
    <p className="text-red-500 text-xs mt-1">{emailError}</p>
  )}
</div>

                  
                  {/* Status */}
                  <div className="space-y-1">
                    <label className="block text-gray-700 text-xs uppercase tracking-wider font-bold">
                      Status
                    </label>
                    <select
                      name="fcaStatus"
                      className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                      value={newAction.fcaStatus}
                      onChange={handleNewActionInputChange}
                    >
                      <option value="YET_TO_BEGIN">Yet to Begin</option>
                      <option value="ACTION_IN_PROGRESS">Action In Progress</option>
                      <option value="ACTION_COMPLETE">Action Complete</option>
                    </select>
                  </div>
                </div>
  
                {/* Action Description */}
                <div className="space-y-1">
                  <label className="block text-gray-700 text-xs uppercase tracking-wider font-bold">
                    Final Corrective Action Description
                  </label>
                  <textarea
                    name="actionDescription"
                    placeholder="Enter final corrective actions details (<400 characters)"
                    className="w-full p-2 border border-gray-300 rounded-md text-sm placeholder:text-xs placeholder:font-mono focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                    rows={3}
                    value={newAction.actionDescription}
                    onChange={handleNewActionInputChange}
                    maxLength={400}
                  ></textarea>
                </div>
                
                {/* Action Notes */}
                <div className="space-y-1">
                  <label className="block text-gray-700 text-xs uppercase tracking-wider font-bold">
                    Corrective Action Follow Up/Effectiveness Notes
                  </label>
                  <textarea
                    name="actionNotes"
                    placeholder="Corrective Action Follow Up/Effectiveness Notes (<400 characters)"
                    className="w-full p-2 border border-gray-300 rounded-md text-sm placeholder:text-xs placeholder:font-mono focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                    rows={3}
                    value={newAction.actionNotes}
                    onChange={handleNewActionInputChange}
                    maxLength={400}
                  ></textarea>
                </div>
                
                {/* Form Buttons */}
                <div className="flex justify-end mt-6 pt-4 border-t border-gray-100">
                  {editingAction && (
                    <button
                      onClick={resetNewAction}
                      className="px-4 py-2 mr-3 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                      type="button"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    onClick={handleSaveAction}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors shadow-sm flex items-center gap-2"
                    type="button"
                  >
                    {editingAction ? "Save Updates" : "Save Action"}
                  </button>
                </div>
              </div>
            </div>
  
            {/* Existing Actions List */}
            <h2 className="text-lg font-semibold mt-8 mb-4 text-rose-500 border-b pb-2">Existing Actions</h2>
            
            {finalActions.length === 0 ? (
              <div className="text-center py-6 bg-gray-50 rounded-md border border-gray-200 text-gray-500">
                No final corrective actions have been added yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 mt-6">
                {finalActions.map((action: FinalCorrectiveAction) => (
                  <div 
                    key={action.fcaId}
                    className={`rounded-xl overflow-hidden shadow-sm border transition-all hover:shadow-md ${
                      action.fcaStatus === "ACTION_COMPLETE" ? "bg-green-50 border-green-200" :
                      action.fcaStatus === "ACTION_IN_PROGRESS" ? "bg-blue-50 border-blue-200" :
                      "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <div className="px-4 py-3 border-b border-gray-200 bg-white bg-opacity-60 flex justify-between items-center">
                      <div className="flex items-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          action.fcaStatus === "ACTION_COMPLETE" ? "bg-green-100 text-green-800" :
                          action.fcaStatus === "ACTION_IN_PROGRESS" ? "bg-blue-100 text-blue-800" :
                          "bg-gray-100 text-gray-800"
                        }`}>
                          {getStatusLabel(action.fcaStatus as FinalCorrectiveAction["fcaStatus"])}
                        </span>
                        <span className="ml-2 text-sm text-gray-500">Due: {action.dueDate}</span>
                      </div>
                      <div className="text-sm text-gray-500">Assigned to: {action.assignedTo}</div>
                    </div>
                    
                    <div className="p-4">
                      <div className="mb-4">
                        <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wider mb-1">Description</h3>
                        <p className="text-sm text-gray-800">{action.actionDescription || 'No description provided.'}</p>
                      </div>
                      
                      <div className="mb-4">
                        <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wider mb-1">Follow-Up Notes</h3>
                        <p className="text-sm text-gray-800">{action.actionNotes || 'No follow-up/notes provided.'}</p>
                      </div>
                    </div>
                    
                    <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex justify-end gap-2">
                      <button
                        onClick={() => handleEditAction(action.fcaId)}
                        className="px-3 py-1.5 bg-cyan-400 text-white rounded text-xs hover:bg-cyan-700 transition-colors"
                        type="button"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleRemoveAction(action.fcaId)}
                        className="px-3 py-1.5 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors"
                        type="button"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };
  
  FinalCorrectiveActionsSection.displayName = "FinalCorrectiveActionsSection";
  
  export default forwardRef(FinalCorrectiveActionsSection);