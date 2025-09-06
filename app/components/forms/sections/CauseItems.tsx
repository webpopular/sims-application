// app/components/forms/sections/CauseItems.tsx - FIXED with correct PermissionGate props
import { PermissionGate } from "../../shared/PermissionGate";

interface CauseItemsProps {
  reportId: string;
  onUpdate: (data: any) => void;
}

export function CauseItems({ reportId, onUpdate }: CauseItemsProps) {
  return (
    <PermissionGate 
      permission="canTakeIncidentRCAActions"
      fallback={
        <div className="text-center p-4 text-gray-500">
          You don't have permission to manage cause items.
        </div>
      }
    >
      <div className="space-y-4">
        <h2 className="text-lg font-medium">Cause Items</h2>
        {/* Form fields */}
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">Root Cause Analysis</label>
            <textarea 
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              rows={4}
              placeholder="Describe the root cause analysis..."
            />
          </div>
          {/* Add more cause-related fields */}
        </div>
      </div>
    </PermissionGate>
  );
}
