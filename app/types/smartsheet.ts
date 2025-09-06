// types/smartsheet.ts
export interface SmartSheetResponse {
    id: number;
    name: string;
    version: number;
    totalRowCount: number;
    accessLevel: string;
    effectiveAttachmentOptions: string[];
    permalink: string;
    createdAt: string;
    modifiedAt: string;
    columns: SmartSheetColumn[];
    rows: SmartSheetRow[];
  }
  
  export interface SmartSheetColumn {
    id: number;
    version: number;
    index: number;
    title: string;
    type: string;
    primary?: boolean;
    validation: boolean;
    width: number;
  }
  
  export interface SmartSheetRow {
    id: number;
    rowNumber: number;
    expanded: boolean;
    createdAt: string;
    modifiedAt: string;
    cells: SmartSheetCell[];
  }
  
  export interface SmartSheetCell {
    columnId: number;
    value?: string | number | null;
    displayValue?: string;
    formula?: string;
  }

  export interface SmartSheetDisplayRow {
    id: string;   
    autoNumber: string;
    emergency: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    employeeType: string;
    dateOfInjury: string;
    bodyPartInjured: string;
    injuryCategory: string;
    supervisorNotified: string;
}
