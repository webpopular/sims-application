// app/components/forms/sections/InvestigationSection.tsx
import { ChevronDown, ChevronRight } from "lucide-react";
import { forwardRef, useState, useRef, useImperativeHandle, useEffect } from 'react';
import { type InterimCorrectiveAction } from '@/app/types';
import { getCurrentUser } from 'aws-amplify/auth';
import { v4 as uuidv4 } from 'uuid'; // Import UUID generator
interface InterimCorrectiveActionsSectionRef {
  getData: () => InterimCorrectiveAction[];
}

interface InterimCorrectiveActionsSectionProps {
  isExpanded: boolean;
  onToggle: () => void;
  onSave: (sectionName: string, interimActions: InterimCorrectiveAction[]) => void;
  ref: React.Ref<InterimCorrectiveActionsSectionRef>; // Use custom ref type
  submissionId: string;
  existingActions: InterimCorrectiveAction[];
}


const InterimCorrectiveActionsSection = forwardRef<
  InterimCorrectiveActionsSectionRef, // Custom ref type
  InterimCorrectiveActionsSectionProps
>(({ isExpanded, onToggle, onSave, submissionId, existingActions = [] }, ref) => {
  const [interimActions, setInterimActions] = useState<InterimCorrectiveAction[]>(existingActions);
  const [newAction, setNewAction] = useState<InterimCorrectiveAction>({
    icaId: uuidv4(),
    dueDate: '',
    assignedTo: '',
    icaStatus: 'ACTION_IN_PROGRESS',
    actionDescription: '',
    uploadedAt: new Date().toISOString(),
    uploadedBy: '',
  });

  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const getUser = async () => {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    };
    getUser();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewAction((prev) => ({
      ...prev,
      [name]: value,
      uploadedAt: new Date().toISOString(),
      uploadedBy: user.username,
      id: uuidv4(),
    }));
  };

  const addAction = () => {
    setInterimActions((prev) => [...prev, newAction]);
    setNewAction({
      icaId: uuidv4(),
      dueDate: '',
      assignedTo: '',
      icaStatus: 'ACTION_IN_PROGRESS',
      actionDescription: '',
      uploadedAt: new Date().toISOString(),
      uploadedBy: user.username,
    });
  };

  const removeAction = (index: number) => {
    setInterimActions((prev) => prev.filter((_, i) => i !== index));
  };

  useImperativeHandle(ref, () => ({
    getData: () => interimActions,
  }));

  return (
    <div className="border-b">
      <button
        onClick={(e) => {
          e.preventDefault();
          onToggle();
        }}
        className="w-full p-4 bg-gray-200 flex items-center"
      >
        {isExpanded ? (
          <ChevronDown className="h-5 w-5 mr-2" />
        ) : (
          <ChevronRight className="h-5 w-5 mr-2" />
        )}
        <span>Interim Corrective Actions</span>
      </button>

      {isExpanded && (
        <div className="p-4">
          {/* Add New Action Form */}
          <div className="space-y-4">
            <h2 className="text-lg font-medium">Add New Action</h2>
            {/* Due Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Due Date</label>
              <input
                type="date"
                name="dueDate"
                className="w-full p-2 border rounded-md"
                value={newAction.dueDate}
                onChange={handleInputChange}
              />
            </div>
            {/* Assigned To */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Assigned To</label>
              <select
                name="assignedTo"
                className="w-full p-2 border rounded-md"
                value={newAction.assignedTo}
                onChange={handleInputChange}
              >
                <option value="">Select User</option>
                <option value="user1">User 1</option>
                {/* Add more users here */}
              </select>
            </div>
            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <select
                name="status"
                className="w-full p-2 border rounded-md"
                value={newAction.icaStatus}
                onChange={handleInputChange}
              >
                <option value="Action In progress">Action In progress</option>
                <option value="Action Complete AND This Interim Action Is Now the Final Corrective Action">
                  Action Complete AND This Interim Action Is Now the Final Corrective Action
                </option>
                <option value="Action Complete – This is only a Stop Gap Measure. A Final Corrective action is Required">
                  Action Complete – This is only a Stop Gap Measure. A Final Corrective action is Required
                </option>
              </select>
            </div>
            {/* Corrective Action Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Corrective Action Description</label>
              <textarea
                name="actionDescription"
                placeholder="Enter interim corrective actions details..."
                className="w-full p-2 border rounded-md"
                rows={4}
                value={newAction.actionDescription}
                onChange={handleInputChange}
              />
            </div>
          </div>

          {/* Add Button */}
          <div className="flex justify-end mt-4">
            <button onClick={addAction} className="px-4 py-2 bg-green-600 text-white rounded">
              Add Action
            </button>
          </div>

          {/* Existing Actions */}
          <h2 className="text-lg font-medium mt-8">Existing Actions</h2>
          {interimActions.map((action, index) => (
            <div key={index} className="border rounded-md p-4">
              <p><strong>Due Date:</strong> {action.dueDate}</p>
              <p><strong>Assigned To:</strong> {action.assignedTo}</p>
              <p><strong>Status:</strong> {action.icaStatus}</p>
              <p><strong>Description:</strong> {action.actionDescription}</p>
              <button
                onClick={() => removeAction(index)}
                className="px-4 py-2 bg-red-600 text-white rounded mt-2"
              >
                Remove
              </button>
            </div>
          ))}

          {/* Save Button */}
          <div className="flex justify-end mt-4">
            <button
              onClick={() => onSave('interimCorrectiveActions', interimActions)}
              className="px-4 py-2 bg-blue-600 text-white rounded"
            >
              Save Changes
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

InterimCorrectiveActionsSection.displayName = 'InterimCorrectiveActionsSection';

export default InterimCorrectiveActionsSection;
