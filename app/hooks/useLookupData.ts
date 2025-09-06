// app/hooks/useLookupData.ts - UPDATED to use client-side service
import { useEffect, useState } from "react";
import { useUserAccess } from "@/app/hooks/useUserAccess";
import { getCachedLookupValues, type LookupValuesResult } from "@/lib/services/lookupValuesService";
import type { ReferenceDataItem } from "@/app/types";

type LookupMap = Record<string, unknown>;

export type ReferenceDataMap = {
  recordTypes: ReferenceDataItem[];
  employeeTypes: ReferenceDataItem[];
  ageRanges: ReferenceDataItem[];
  tenureRanges: ReferenceDataItem[];
  experienceLevels: ReferenceDataItem[];
  locationTypes: ReferenceDataItem[]; // ✅ This will now be filtered by hierarchy
  activityTypes: ReferenceDataItem[];
  injuryTypes: ReferenceDataItem[];
  injuredBodyParts: ReferenceDataItem[];
  incidentTypes: ReferenceDataItem[];
  whereDidThisOccur: ReferenceDataItem[];
  rootCauses: ReferenceDataItem[];
  rootCauseGroupMap?: Record<string, string[]>;
  typeOfConcern: ReferenceDataItem[];
  priorityTypes: ReferenceDataItem[];
  directCauseGroups: string[];
  directCauseGroupMap?: Record<string, string[]>;
};

export const useLookupData = () => {
  const { userAccess, isReady } = useUserAccess();
  const [lookupValues, setLookupValues] = useState<Record<string, ReferenceDataItem[]>>({});
  const [rawLookupObject, setRawLookupObject] = useState<LookupMap>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchLookupData() {
      try {
        setIsLoading(true);
        
        // ✅ Use client-side service instead of API route
        const userEmail = isReady && userAccess?.email ? userAccess.email : undefined;
        
        console.log(`[useLookupData] Fetching lookup data using client-side service for: ${userEmail || 'anonymous'}`);
        if (userAccess) {
          console.log(`[useLookupData] User access scope: ${userAccess.accessScope}`);
          console.log(`[useLookupData] User hierarchy: ${userAccess.hierarchyString}`);
          console.log(`[useLookupData] User plant: ${userAccess.plant}`);
        }
        
        const lookupResult: LookupValuesResult = await getCachedLookupValues(userEmail);
        
        if (!lookupResult.success) {
          console.error('[useLookupData] Failed to fetch lookup data:', lookupResult.error);
          return;
        }
        
        console.log(`[useLookupData] Service response:`, {
          plantLocationCount: lookupResult.plantLocationCount,
          plantLocations: lookupResult.plantLocations.slice(0, 5),
          userEmail: lookupResult.userEmail || 'No user'
        });
        
        // ✅ FIXED: Include Direct Cause fields in rawData
        const rawData: LookupMap = {
          "Employee Type": lookupResult["Employee Type"],
          "Age Range": lookupResult["Age Range"],
          "Experience at ITW": lookupResult["Experience at ITW"],
          "Experience in Role": lookupResult["Experience in Role"],
          "Plant Location": lookupResult["Plant Location"], // ✅ Now filtered by hierarchy
          "Work Activity Type": lookupResult["Work Activity Type"],
          "Injury Type": lookupResult["Injury Type"],
          "Injured Body Part": lookupResult["Injured Body Part"],
          "Incident Type": lookupResult["Incident Type"],
          "Where Did This Occur": lookupResult["Where Did This Occur"],
          "Type of Concern": lookupResult["Type of Concern"],
          "Priority Types": lookupResult["Priority Types"],
          "Root Cause": lookupResult["Root Cause"],
          // ✅ ADD MISSING DIRECT CAUSE FIELDS
          "Direct Cause Groups": lookupResult["Direct Cause Groups"],
          "Direct Cause Group": lookupResult["Direct Cause Group"]
        };
        
        setRawLookupObject(rawData);

        const transformed: Record<string, ReferenceDataItem[]> = {};
        for (const key in rawData) {
          if (Array.isArray(rawData[key])) {
            transformed[key] = (rawData[key] as string[]).map((value: string, index: number) => ({
              id: String(index),
              value,
              label: value,
              category: key,
              isActive: true,
            }));
          } else {
            console.warn(`[useLookupData] Skipping non-array key: ${key}`, rawData[key]);
          }
        }

        setLookupValues(transformed);
        
        console.log(`[useLookupData] Final transformed data:`, {
          userEmail: userAccess?.email || 'No user',
          accessScope: userAccess?.accessScope || 'No scope',
          plantLocationsCount: transformed["Plant Location"]?.length || 0,
          plantLocations: transformed["Plant Location"]?.map(l => l.value) || [],
          allKeys: Object.keys(transformed)
        });
        
        // ✅ ADD DEBUG LOGS FOR DIRECT CAUSE DATA
        console.log(`[useLookupData] Direct Cause Groups:`, rawData["Direct Cause Groups"]);
        console.log(`[useLookupData] Direct Cause Group Map:`, rawData["Direct Cause Group"]);
        
      } catch (err) {
        console.error("Error loading lookup values:", err);
      } finally {
        setIsLoading(false);
      }
    }

    // ✅ Only fetch when user access is ready OR if no user context needed
    if (isReady) {
      fetchLookupData();
    } else if (!userAccess) {
      // For cases where no user context is available, fetch unfiltered data
      fetchLookupData();
    }
  }, [userAccess, isReady]); // ✅ Depend on both userAccess and isReady

  const getOptions = (fieldName: keyof typeof lookupValues): ReferenceDataItem[] => {
    const options = lookupValues[fieldName] || [];
    console.log(`[useLookupData] getOptions for ${fieldName}:`, {
      count: options.length,
      values: options.map(o => o.value)
    });
    return options;
  };

  const referenceData: ReferenceDataMap = {
    recordTypes: [],
    employeeTypes: lookupValues["Employee Type"] || [],
    ageRanges: lookupValues["Age Range"] || [],
    tenureRanges: lookupValues["Experience at ITW"] || [],
    experienceLevels: lookupValues["Experience in Role"] || [],
    locationTypes: lookupValues["Plant Location"] || [],
    activityTypes: lookupValues["Work Activity Type"] || [],
    injuryTypes: lookupValues["Injury Type"] || [],
    injuredBodyParts: lookupValues["Injured Body Part"] || [],
    incidentTypes: lookupValues["Incident Type"] || [],
    whereDidThisOccur: lookupValues["Where Did This Occur"] || [],
    typeOfConcern: lookupValues["Type of Concern"] || [],
    priorityTypes: lookupValues["Priority Types"] || [],
    rootCauses: lookupValues["Root Cause"] || [],

    directCauseGroupMap: typeof rawLookupObject["Direct Cause Group"] === "object" && !Array.isArray(rawLookupObject["Direct Cause Group"])
      ? (rawLookupObject["Direct Cause Group"] as Record<string, string[]>)
      : undefined,

    rootCauseGroupMap: typeof rawLookupObject["Root Cause Group"] === "object" && !Array.isArray(rawLookupObject["Root Cause Group"])
      ? (rawLookupObject["Root Cause Group"] as Record<string, string[]>)
      : undefined,
      
    // ✅ FIXED: Populate directCauseGroups from lookup data
    directCauseGroups: Array.isArray(rawLookupObject["Direct Cause Groups"])
      ? rawLookupObject["Direct Cause Groups"] as string[]
      : []
  };

  return {
    getOptions,
    lookupValues,
    referenceData,
    isLoading,
  };
};
