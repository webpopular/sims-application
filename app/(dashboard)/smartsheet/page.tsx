// app/(dashboard)/smartsheet/page.tsx
import SmartSheetList from "@/app/components/smartsheet/SmartSheetList";
import { useSmartSheetData } from "@/app/hooks/useSmartSheetData";

export default function SmartSheetPage(){

    return(

        <div className="ml-4 p-6">
        <div className="max-w-6xl mx-auto">
          <SmartSheetList />
        </div>
      </div>

    );
}