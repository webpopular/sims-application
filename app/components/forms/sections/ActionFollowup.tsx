// app/components/forms/sections/ActionFollowup.tsx - FIXED with correct PermissionGate props
import { PermissionGate } from "../../shared/PermissionGate";

interface ActionFollowupProps {
  reportId: string;
  onUpdate: (data: any) => void;
}

export function ActionFollowup({ reportId, onUpdate }: ActionFollowupProps) {
  return (
    <PermissionGate 
      permission="canTakeFirstReportActions"
      fallback={
        <div className="text-center p-4 text-gray-500">
          You don't have permission to manage action items.
        </div>
      }
    >
      <div className="space-y-4">
        <h2 className="text-lg font-medium">Action & Follow-up</h2>
        {/* Form fields */}
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">Corrective Actions</label>
            <textarea 
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              rows={3}
              placeholder="Describe corrective actions taken..."
            />
          </div>
          
          {/* Add more action-related fields */}
        </div>
      </div>
    </PermissionGate>
  );
}
