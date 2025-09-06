//app/components/forms/section/InterimCorrectiveActions.tsx

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
import type { InterimCorrectiveAction } from "@/app/types";
import { generateInterimCorrectiveActionEmail } from "@/app/utils/emailTemplates/interimCorrectiveActionEmail";
import { sendEmail } from "@/app/utils/aws/ses";
import { getUserInfo } from "@/lib/utils/getUserInfo";
import { fetchSubmissionData } from "@/app/api/fetchSubmissionData";
import toast from 'react-hot-toast';
import { Toaster } from 'react-hot-toast';

// Expose a handle so that the parent component can call getData()
export interface InterimCorrectiveActionsSectionHandle {
  getData: () => InterimCorrectiveAction[];
}

const statusLabels: Record<InterimCorrectiveAction["icaStatus"], string> = {
  "YET_TO_BEGIN": "Yet to Begin",
  "ACTION_IN_PROGRESS": "Action In Progress",
  "ACTION_COMPLETE_AND_FINAL": "Action Complete AND This Interim Action Is Now the Final Corrective Action",
  "ACTION_COMPLETE_STOP_GAP": "Action Complete - This is only a Stop Gap Measure. A Final Corrective action is Required"
};


const getStatusLabel = (status: InterimCorrectiveAction["icaStatus"]) =>
  statusLabels[status] || status; // Fallback if an unknown status appears

interface InterimCorrectiveActionsSectionProps {
  isExpanded: boolean;
  onToggle: () => void;
  onSave: (sectionName: string, interimActions: InterimCorrectiveAction[]) => void;
  domRef?: React.RefObject<HTMLDivElement>;
  submissionId: string;
  existingActions: InterimCorrectiveAction[];
}

const InterimCorrectiveActionsSection: ForwardRefRenderFunction<
  InterimCorrectiveActionsSectionHandle,
  InterimCorrectiveActionsSectionProps
> = (
  { isExpanded, onToggle, onSave, domRef, submissionId, existingActions = [] },
  ref
) => {
    // Local state for the list of ICA entries and the new (or currently edited) action.
    const [interimActions, setInterimActions] = useState<InterimCorrectiveAction[]>(existingActions);
    const [newAction, setNewAction] = useState<InterimCorrectiveAction>(() => ({
      icaId: uuidv4(),
      dueDate: "",
      assignedTo: "",
      icaStatus: "YET_TO_BEGIN",
      actionDescription: "",
      uploadedAt: "",
      uploadedBy: "",
    }));
    const [editingAction, setEditingAction] = useState<string | null>(null);
    const [user, setUser] = useState<any>(null);
    const [emailError, setEmailError] = useState<string>("");
 
 

    useEffect(() => {
      const fetchUser = async () => {
        const currentUser = await getCurrentUser();
        console.log("[ICA] Current user:", currentUser);
        setUser(currentUser);
      };
      fetchUser();
    }, []);

    useEffect(() => {
      console.log("[ICA] Received existing actions:", existingActions);
      if (existingActions?.length > 0) {
        // Log each action's status
        existingActions.forEach(action => {
          console.log(`Action ${action.icaId} status:`, action.icaStatus);
        });
        setInterimActions(existingActions);// Ensure the state updates when props change
      }
    }, [existingActions]);

    // Expose getData() to the parent.
    useImperativeHandle(ref, () => ({
      getData: () => interimActions,
    }));

    // Handle input changes for the new action form.
    const handleNewActionInputChangexxx = (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
      const { name, value } = e.target;

      // Log the value to debug
      if (name === "icaStatus") {
        console.log("Selected status value:", value);
      }

      setNewAction((prev: InterimCorrectiveAction) => ({
        ...prev,
        [name]: value,
        uploadedAt: new Date().toISOString(),
        uploadedBy: user?.username || "",
      }));
    };
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
    
      // Log the value to debug
      if (name === "icaStatus") {
        console.log("Selected status value:", value);
      }
    
      setNewAction((prev: InterimCorrectiveAction) => ({
        ...prev,
        [name]: value,
        uploadedAt: new Date().toISOString(),
        uploadedBy: user?.username || "",
      }));
    };
    
  


    // Save action (Add new or update existing)
    const handleSaveActionxxx = () => {
      let updatedActions: InterimCorrectiveAction[];

      if (editingAction) {
        // Update existing action
        updatedActions = interimActions.map((action: InterimCorrectiveAction) =>
          action.icaId === editingAction ? { ...newAction, icaId: editingAction } : action
        );
        console.log("[ICA] Action updated:", newAction);
        setEditingAction(null);
      } else {
        // Add new action
        const actionToAdd = { ...newAction, icaId: uuidv4() };
        updatedActions = [...interimActions, actionToAdd];
        console.log("[ICA] New action added:", actionToAdd);
      }

      // Update state and save to parent
      setInterimActions(updatedActions);
      onSave("interimCorrectiveActions", updatedActions);

      // Reset form
      resetNewAction();
    };


   


    //const userInfo = await getUserInfo();
    //const senderName = userInfo.email || userInfo.username || 'Unknown'; 
 
// Email validation helper function
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Save action (Add new or update existing)
// Inside your handleSaveAction function:
const handleSaveAction = async () => {
  // Validate email before saving
  if (newAction.assignedTo && !isValidEmail(newAction.assignedTo)) {
    setEmailError("Please enter a valid email address");
    toast.error("Please enter a valid email address");
    return; // Prevent saving
  }

  let updatedActions: InterimCorrectiveAction[];
  let isUpdate = false;

  if (editingAction) {
    // Update existing action
    updatedActions = interimActions.map((action: InterimCorrectiveAction) =>
      action.icaId === editingAction ? { ...newAction, icaId: editingAction } : action
    );
    console.log("[ICA] Action updated:", newAction);
    setEditingAction(null);
    isUpdate = true;
  } else {
    // Add new action
    const actionToAdd = { ...newAction, icaId: uuidv4() };
    updatedActions = [...interimActions, actionToAdd];
    console.log("[ICA] New action added:", actionToAdd);
  }

  // Update state and save to parent
  setInterimActions(updatedActions);
  await onSave("interimCorrectiveActions", updatedActions);
  
  // Show success toast
  toast.success(isUpdate ? "Action updated successfully" : "Action added successfully");
  
  // Send email notification if there's an assignee email
// Send email notification if there's an assignee email
if (newAction.assignedTo && newAction.assignedTo.includes('@')) {
  try {
    const userInfo = await getUserInfo();
    const senderName = userInfo.name !== "Unknown" ? userInfo.name : userInfo.username;
    const senderEmail = userInfo.email || "";

    // Fetch the full submission data to include in the email
    const submissionData = await fetchSubmissionData(submissionId);
    
    // Generate email content using the template
    const emailContent = generateInterimCorrectiveActionEmail(
      newAction, 
      submissionData, 
      senderName,
      senderEmail,  // Add the senderEmail parameter here
      isUpdate
    );
    
    // Send the email
    const emailResult = await sendEmail(
      [newAction.assignedTo], 
      `[SIMS] Interim Corrective Action ${submissionId}`,
      emailContent
    );
    
    if (emailResult && typeof emailResult === 'object' && emailResult.success) {
      console.log(`[ICA] Email notification sent to ${newAction.assignedTo}`);
      toast(`Email notification sent to ${newAction.assignedTo}`, {
        icon: '✅'
      });
    } else {
      console.warn(`[ICA] Email notification could not be delivered to ${newAction.assignedTo}`);
      toast(`Email notification could not be sent to ${newAction.assignedTo}. The action was saved.`, {
        icon: '⚠️'
      });
    }
  } catch (error) {
    console.error("[ICA] Error sending email notification:", error);
    toast(`Failed to send email notification, but action was saved`, {
      icon: '❌'
    });
  }
}


  // Reset form
  resetNewAction();
};


    
    
    


    // Prepare an action for editing.
    const handleEditAction = (icaId: string) => {
      const actionToEdit = interimActions.find(
        (action: InterimCorrectiveAction) => action.icaId === icaId
      );
      if (actionToEdit) {
        setNewAction(actionToEdit);
        setEditingAction(icaId);
        console.log("[ICA] Editing action:", actionToEdit);
      }
    };

    // Remove an action.
    const handleRemoveAction = (icaId: string) => {
      const updatedActions = interimActions.filter(
        (action: InterimCorrectiveAction) => action.icaId !== icaId
      );
      setInterimActions(updatedActions);
      onSave("interimCorrectiveActions", updatedActions);
      console.log("[ICA] Action removed, icaId:", icaId);
    };

    // Reset the new action form.
    const resetNewAction = () => {
      setNewAction({
        icaId: uuidv4(),
        dueDate: "",
        assignedTo: "",
        icaStatus: "YET_TO_BEGIN",
        actionDescription: "",
        uploadedAt: "",
        uploadedBy: "",
      });
    };

    const getOverallStatus = () => {
      if (!interimActions.length) return { text: "Not Created", colors: [] };

      const yetToBeginCount = interimActions.filter(action => action.icaStatus === "YET_TO_BEGIN").length;
      const inProgressCount = interimActions.filter(action => action.icaStatus === "ACTION_IN_PROGRESS").length;
      const completedCount = interimActions.filter(action => action.icaStatus === "ACTION_COMPLETE_AND_FINAL" || action.icaStatus === "ACTION_COMPLETE_STOP_GAP").length;

      let statusParts = [];
      let colors = [];

      if (yetToBeginCount > 0) {
        statusParts.push(`Yet to Begin (${yetToBeginCount})`);
        colors.push("bg-gray-100 text-gray-800");
      }

      if (inProgressCount > 0) {
        statusParts.push(`In Progress (${inProgressCount})`);
        colors.push("bg-blue-100 text-blue-800");
      }

      if (completedCount > 0) {
        statusParts.push(`Completed (${completedCount})`);
        colors.push("bg-green-100 text-green-800");
      }

      return {
        text: statusParts.join(" | ") || "Not Created",
        colors: colors
      };
    };


    return (
      <div ref={domRef} className="border-b">
         <Toaster position="top-right" />
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
            <span>Interim Corrective Actions</span>
            <span className="ml-2 text-xs text-gray-500">({interimActions.length} actions)</span>
          </div>
          <div className="flex items-center space-x-2">
            {getOverallStatus().colors.map((color, index) => (
              <span key={index} className={`text-xs px-2 py-0.5 rounded-full ${color}`}>
                {getOverallStatus().text.split(" | ")[index]}
              </span>
            ))}
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
                      name="icaStatus"
                      className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                      value={newAction.icaStatus}
                      onChange={handleNewActionInputChange}
                    >
                      <option value="YET_TO_BEGIN">Yet to Begin</option>
                      <option value="ACTION_IN_PROGRESS">Action In Progress</option>
                      <option value="ACTION_COMPLETE_AND_FINAL">Action Complete AND This Interim Action Is Now the Final Corrective Action</option>
                      <option value="ACTION_COMPLETE_STOP_GAP">Action Complete - This is only a Stop Gap Measure. A Final Corrective action is Required</option>
                    </select>
                  </div>
                </div>
    
                {/* Action Description */}
                <div className="space-y-1">
                  <label className="block text-gray-700 text-xs uppercase tracking-wider font-bold">
                    Corrective Action Description
                  </label>
                  <textarea
                    name="actionDescription"
                    placeholder="Enter interim corrective actions details (<400 characters)"
                    className="w-full p-2 border border-gray-300 rounded-md text-sm placeholder:text-xs placeholder:font-mono focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                    rows={3}
                    value={newAction.actionDescription}
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
            
            {interimActions.length === 0 ? (
              <div className="text-center py-6 bg-gray-50 rounded-md border border-gray-200 text-gray-500">
                No interim corrective actions have been added yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 mt-6">
                {interimActions.map((action: InterimCorrectiveAction) => (
                  <div 
                    key={action.icaId}
                    className={`rounded-xl overflow-hidden shadow-sm border transition-all hover:shadow-md ${
                      action.icaStatus === "ACTION_COMPLETE_AND_FINAL" ? "bg-green-50 border-green-200" :
                      action.icaStatus === "ACTION_COMPLETE_STOP_GAP" ? "bg-yellow-50 border-yellow-200" :
                      action.icaStatus === "ACTION_IN_PROGRESS" ? "bg-blue-50 border-blue-200" :
                      "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <div className="px-4 py-3 border-b border-gray-200 bg-white bg-opacity-60 flex justify-between items-center">
                      <div className="flex items-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          action.icaStatus === "ACTION_COMPLETE_AND_FINAL" ? "bg-green-100 text-green-800" :
                          action.icaStatus === "ACTION_COMPLETE_STOP_GAP" ? "bg-yellow-100 text-yellow-800" :
                          action.icaStatus === "ACTION_IN_PROGRESS" ? "bg-blue-100 text-blue-800" :
                          "bg-gray-100 text-gray-800"
                        }`}>
                          {getStatusLabel(action.icaStatus as InterimCorrectiveAction["icaStatus"])}
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
                    </div>
                    
                    <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex justify-end gap-2">
                      <button
                        onClick={() => handleEditAction(action.icaId)}
                        className="px-3 py-1.5 bg-cyan-400 text-white rounded text-xs hover:bg-cyan-700 transition-colors"
                        type="button"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleRemoveAction(action.icaId)}
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

InterimCorrectiveActionsSection.displayName = "InterimCorrectiveActionsSection";

export default forwardRef(InterimCorrectiveActionsSection);
