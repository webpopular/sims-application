// app/components/forms/sections/InjuryDetails.tsx - FIXED with correct PermissionGate props
import { PermissionGate } from "../../shared/PermissionGate";

interface InjuryDetailsProps {
  reportId: string;
  onUpdate: (data: any) => void;
}

export function InjuryDetails({ reportId, onUpdate }: InjuryDetailsProps) {
  return (
    <PermissionGate 
      permission="canViewOpenClosedReports"
      fallback={
        <div className="text-center p-4 text-gray-500">
          You don't have permission to view injury details.
        </div>
      }
    >
      <div className="space-y-4">
        <h2 className="text-lg font-medium">Injury Report Details</h2>
        {/* Form fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Report ID</label>
            <input 
              type="text" 
              value={reportId} 
              disabled 
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
            />
          </div>
          {/* Add more form fields as needed */}
        </div>
      </div>
    </PermissionGate>
  );
}
