'use client';

import { CheckCircle, Circle } from "lucide-react";

interface ProgressTrackerProps {
  icaStatus: string;
  isRCAComplete: string;
  fcaStatus: string;
  eventApprovalStatus: string;
  investigationStatus: string;
}

const statusSteps = [
  { key: "icaStatus", label: "Interim Action" },
  { key: "isRCAComplete", label: "RCA" },
  { key: "fcaStatus", label: "Final Action" },
  { key: "eventApprovalStatus", label: "Approval" },
  { key: "investigationStatus", label: "Closure" },
];

export default function ProgressTracker({
  icaStatus,
  isRCAComplete,
  fcaStatus,
  eventApprovalStatus,
  investigationStatus,
}: ProgressTrackerProps) {
  
  const statusValues: Record<string, boolean> = {
    icaStatus: icaStatus === "ACTION_COMPLETE_STOP_GAP" || icaStatus === "ACTION_COMPLETE_AND_FINAL",
    isRCAComplete: isRCAComplete === "Complete",
    fcaStatus: fcaStatus === "ACTION_COMPLETE",
    eventApprovalStatus: eventApprovalStatus === "Approved",
    investigationStatus: investigationStatus === "Closed",
  };

  return (
    <div className="flex items-center justify-between w-full bg-white shadow-md rounded-lg p-6">
      {statusSteps.map((step, index) => (
        <div key={step.key} className="flex flex-col items-center relative w-1/5">
          {/* Connector Line */}
          {index > 0 && (
            <div className={`absolute top-1/2 left-[-50%] w-full h-1 ${
              statusValues[step.key] ? "bg-green-500" : "bg-gray-300"
            }`}></div>
          )}
          
          {/* Step Icon */}
          <div className={`w-4 h-4 flex items-center justify-center rounded-full border-2 ${
            statusValues[step.key] ? "bg-green-500 text-white" : "bg-white text-gray-400 border-gray-400"
          }`}>
            {statusValues[step.key] ? <CheckCircle size={24} /> : <Circle size={24} />}
          </div>

          {/* Step Label */}
          <span className="text-xs font-medium text-gray-700 mt-2">{step.label}</span>
        </div>
      ))}
    </div>
  );
}
