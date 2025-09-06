//app/components/forms/sections/InjuryFormSection.tsx
'use client';
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import InjuryForm from "../InjuryForm";
import { useSearchParams } from "next/navigation";
import { InjuryFormProps } from "@/app/types";

interface InjuryFormSectionProps {
  isExpanded: boolean;
  onToggle: () => void;
  submissionId: string;
  existingInjuryData?: any;
  formType: "US" | "Global";  // Added formType prop
}

export default function InjuryFormSection({ 
  isExpanded, 
  onToggle, 
  submissionId, 
  existingInjuryData,
  formType,    
}: InjuryFormSectionProps) {

  const searchParams = useSearchParams();
  const urlMode = (searchParams.get("mode") || "edit") as InjuryFormProps["mode"];
  console.log("InjuryFormSection: Extracted mode from URL:", urlMode);  // Debugging log

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
          <span>Injury Form</span>
        </div>

        {/* 🔹 Show Form Type instead of Status */}
        <span className="text-xs font-medium px-2 py-1 rounded-md bg-blue-100 text-blue-700">
          {formType} Form
        </span>
      </button>

      {/* 🔹 Expanded Content */}
      {isExpanded && (
        <div className="p-4 bg-white shadow-sm rounded-b-md">
          <InjuryForm 
            mode={urlMode} // ✅ ✅ Ensure URL mode is passed!
            formType={formType}  // ✅ Dynamically passed to the form
            initialData={existingInjuryData}  // ✅ Pass existing injury data!
            title={`${formType} Injury Report`} 
          />
        </div>
      )}
    </div>
  );
}

