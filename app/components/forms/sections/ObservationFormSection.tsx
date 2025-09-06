// app/components/forms/sections/ObservationFormSection.tsx
'use client';
import { ChevronDown, ChevronRight } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { InjuryFormProps } from "@/app/types";
import ObservationReportForm from "../ObservationReportForm";

interface ObservationFormSectionProps {
  isExpanded: boolean;
  onToggle: () => void;
  submissionId: string;
  existingObservationData?: any;
}

export default function ObservationFormSection({ 
  isExpanded, 
  onToggle, 
  submissionId, 
  existingObservationData,
}: ObservationFormSectionProps) {

  const searchParams = useSearchParams();
  const urlMode = (searchParams.get("mode") || "readonly") as InjuryFormProps["mode"];
  console.log("ObservationFormSection: Extracted mode from URL:", urlMode);

  return (
    <div className="border-b">
      {/* Section Header */}
      <button 
        onClick={onToggle} 
        className={`w-full flex justify-between items-center px-4 py-3 text-sm font-medium transition-all duration-200 border-b border-gray-200 last:border-b-0
          ${isExpanded ? "bg-red-50" : "bg-white"} 
          hover:bg-red-200 hover:text-sm rounded-md`}
      >
        <div className="flex items-center">
          {isExpanded ? <ChevronDown className="h-5 w-5 mr-2" /> : <ChevronRight className="h-5 w-5 mr-2" />}
          <span>Observation Report</span>
        </div>

        {/* Status Badge */}
        <span className="text-xs font-medium px-2 py-1 rounded-md bg-blue-100 text-blue-700">
          Observation
        </span>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4 bg-white shadow-sm rounded-b-md">
          <ObservationReportForm
            mode={urlMode.startsWith("investigate") ? "readonly" : urlMode as "create" | "edit" | "readonly"}
            initialData={existingObservationData}
            title="Observation Report"
          />
        </div>
      )}
    </div>
  );
}
