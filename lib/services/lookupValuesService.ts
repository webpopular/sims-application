// lib/services/lookupValuesService.ts - FIXED division matching logic
'use client';

import { generateClient } from 'aws-amplify/data';
import { type Schema } from "@/amplify/data/schema";
import { getCachedUserAccess } from './userAccessService';

const client = generateClient<Schema>();

export interface LookupValuesResult {
  success: boolean;
  userEmail: string;
  plantLocationCount: number;
  plantLocations: string[];
  "Employee Type": string[];
  "Age Range": string[];
  "Experience at ITW": string[];
  "Experience in Role": string[];
  "Plant Location": string[];
  "Work Activity Type": string[];
  "Injury Type": string[];
  "Injured Body Part": string[];
  "Incident Type": string[];
  "Where Did This Occur": string[];
  "Type of Concern": string[];
  "Priority Types": string[];
  "Root Cause": string[];
  "Direct Cause Groups": string[];
  "Direct Cause Group": Record<string, string[]>;
  error?: string;
}

// ✅ FIXED: Extract plants by division with proper key matching
function extractPlantsByDivision(hierarchy: any, divisionName: string): string[] {
  const result: string[] = [];
  
  try {
    const segments = hierarchy?.segments || {};
    
    // ✅ FIXED: Remove trailing > from division name for matching
    const cleanDivisionName = divisionName.replace(/>/g, '');
    console.log(`🔍 [LookupValuesService] Looking for division: "${cleanDivisionName}"`);
    
    for (const segmentKey in segments) {
      const platforms = segments[segmentKey]?.platforms || {};
      
      for (const platformKey in platforms) {
        const divisions = platforms[platformKey]?.divisions || {};
        
        for (const divKey in divisions) {
          // ✅ FIXED: Check if division key contains the clean division name
          if (divKey.includes(`>${cleanDivisionName}>`)) {
            const plants = divisions[divKey] || [];
            if (Array.isArray(plants)) {
              result.push(...plants);
              console.log(`✅ [LookupValuesService] Found division match: ${divKey} -> ${plants.length} plants`);
              console.log(`📋 [LookupValuesService] Plants in division: ${plants.join(', ')}`);
            }
          }
        }
      }
    }
    
    return [...new Set(result)].sort(); // Remove duplicates and sort
    
  } catch (error) {
    console.error('❌ [LookupValuesService] Error extracting plants by division:', error);
    return [];
  }
}

// ✅ FIXED: Extract plants by platform with proper key matching
function extractPlantsByPlatform(hierarchy: any, platformName: string): string[] {
  const result: string[] = [];
  
  try {
    const segments = hierarchy?.segments || {};
    
    // ✅ FIXED: Remove trailing > from platform name for matching
    const cleanPlatformName = platformName.replace(/>/g, '');
    console.log(`🔍 [LookupValuesService] Looking for platform: "${cleanPlatformName}"`);
    
    for (const segmentKey in segments) {
      const platforms = segments[segmentKey]?.platforms || {};
      
      for (const platKey in platforms) {
        // ✅ FIXED: Check if platform key contains the clean platform name
        if (platKey.includes(`>${cleanPlatformName}>`)) {
          const divisions = platforms[platKey]?.divisions || {};
          
          for (const divKey in divisions) {
            const plants = divisions[divKey] || [];
            if (Array.isArray(plants)) {
              result.push(...plants);
              console.log(`✅ [LookupValuesService] Found platform match: ${platKey} -> ${plants.length} plants`);
            }
          }
        }
      }
    }
    
    return [...new Set(result)].sort(); // Remove duplicates and sort
    
  } catch (error) {
    console.error('❌ [LookupValuesService] Error extracting plants by platform:', error);
    return [];
  }
}

// ✅ FIXED: Extract plants by segment with proper key matching
function extractPlantsBySegment(hierarchy: any, segmentName: string): string[] {
  const result: string[] = [];
  
  try {
    const segments = hierarchy?.segments || {};
    
    // ✅ FIXED: Remove trailing > from segment name for matching
    const cleanSegmentName = segmentName.replace(/>/g, '');
    console.log(`🔍 [LookupValuesService] Looking for segment: "${cleanSegmentName}"`);
    
    for (const segKey in segments) {
      // ✅ FIXED: Check if segment key contains the clean segment name
      if (segKey.includes(`>${cleanSegmentName}>`)) {
        const platforms = segments[segKey]?.platforms || {};
        
        for (const platformKey in platforms) {
          const divisions = platforms[platformKey]?.divisions || {};
          
          for (const divKey in divisions) {
            const plants = divisions[divKey] || [];
            if (Array.isArray(plants)) {
              result.push(...plants);
              console.log(`✅ [LookupValuesService] Found segment match: ${segKey} -> ${plants.length} plants`);
            }
          }
        }
      }
    }
    
    return [...new Set(result)].sort(); // Remove duplicates and sort
    
  } catch (error) {
    console.error('❌ [LookupValuesService] Error extracting plants by segment:', error);
    return [];
  }
}

// ✅ Extract all plants from hierarchy mapping
function extractAllPlantsFromMapping(hierarchy: any): string[] {
  const allPlants: string[] = [];
  
  try {
    const segments = hierarchy?.segments || {};
    
    for (const segmentKey in segments) {
      const platforms = segments[segmentKey]?.platforms || {};
      
      for (const platformKey in platforms) {
        const divisions = platforms[platformKey]?.divisions || {};
        
        for (const divisionKey in divisions) {
          const plants = divisions[divisionKey] || [];
          if (Array.isArray(plants)) {
            allPlants.push(...plants);
          }
        }
      }
    }
    
    // Remove duplicates and sort
    return [...new Set(allPlants)].sort();
    
  } catch (error) {
    console.error('❌ [LookupValuesService] Error extracting all plants:', error);
    return [];
  }
}

// ✅ Get plants for specific user (plant level) - find by partial match
function getPlantsForUser(hierarchy: any, userPlant: string): string[] {
  try {
    const allPlants = extractAllPlantsFromMapping(hierarchy);
    
    // Find plants that contain the user's plant name (case insensitive)
    const matchingPlants = allPlants.filter(plant => 
      plant.toLowerCase().includes(userPlant.toLowerCase()) ||
      userPlant.toLowerCase().includes(plant.toLowerCase())
    );
    
    console.log(`🔍 [LookupValuesService] User plant "${userPlant}" matched: ${matchingPlants.join(', ')}`);
    
    return matchingPlants.length > 0 ? matchingPlants : [];
    
  } catch (error) {
    console.error('❌ [LookupValuesService] Error getting plants for user:', error);
    return [];
  }
}

// ✅ FIXED: Get accessible plants using proper hierarchy-mapping.json structure
async function getAccessiblePlants(userEmail: string) {
  try {
    console.log(`🏭 [LookupValuesService] Getting plants for: ${userEmail}`);
    
    const userAccess = await getCachedUserAccess(userEmail);
    if (!userAccess) {
      console.error('❌ [LookupValuesService] No user access found from userAccessService');
      return [];
    }
    
    console.log(`🏢 [LookupValuesService] User access scope: ${userAccess.accessScope}`);
    console.log(`🏢 [LookupValuesService] User hierarchy: ${userAccess.hierarchyString}`);
    console.log(`🏢 [LookupValuesService] User plant: ${userAccess.plant}`);
    console.log(`🏢 [LookupValuesService] User division: ${userAccess.division}`);
    console.log(`🏢 [LookupValuesService] User platform: ${userAccess.platform}`);
    console.log(`🏢 [LookupValuesService] User segment: ${userAccess.segment}`);
    
    // ✅ Fetch hierarchy mapping from S3
    const hierarchyResponse = await fetch('https://simsstoragereflkpdata.s3.amazonaws.com/hierarchy-mapping.json');
    
    if (!hierarchyResponse.ok) {
      throw new Error(`Failed to fetch hierarchy mapping: ${hierarchyResponse.status}`);
    }
    
    const hierarchyMapping = await hierarchyResponse.json();
    console.log('✅ [LookupValuesService] Successfully fetched hierarchy mapping from S3');
    
    let accessiblePlants: string[] = [];
    
    // ✅ FIXED: Apply proper hierarchy filtering using the nested structure
    switch (userAccess.accessScope) {
      case 'ENTERPRISE':
        console.log(`🌐 [LookupValuesService] Enterprise access - showing all plants`);
        accessiblePlants = extractAllPlantsFromMapping(hierarchyMapping);
        break;
        
      case 'SEGMENT':
        console.log(`🏭 [LookupValuesService] Segment access - filtering by segment: ${userAccess.segment}`);
        accessiblePlants = extractPlantsBySegment(hierarchyMapping, userAccess.segment);
        break;
        
      case 'PLATFORM':
        console.log(`🏗️ [LookupValuesService] Platform access - filtering by platform: ${userAccess.platform}`);
        accessiblePlants = extractPlantsByPlatform(hierarchyMapping, userAccess.platform);
        break;
        
      case 'DIVISION':
        console.log(`🏢 [LookupValuesService] Division access - filtering by division: ${userAccess.division}`);
        accessiblePlants = extractPlantsByDivision(hierarchyMapping, userAccess.division);
        break;
        
      case 'PLANT':
        console.log(`🏭 [LookupValuesService] Plant access - showing only user's plant: ${userAccess.plant}`);
        accessiblePlants = getPlantsForUser(hierarchyMapping, userAccess.plant);
        break;
    }
    
    console.log(`✅ [LookupValuesService] Found ${accessiblePlants.length} accessible plants for user`);
    console.log(`📋 [LookupValuesService] Plants: ${accessiblePlants.slice(0, 5).join(', ')}${accessiblePlants.length > 5 ? '...' : ''}`);
    
    return accessiblePlants;
    
  } catch (error) {
    console.error('❌ [LookupValuesService] Error getting accessible plants:', error);
    return [];
  }
}

// ✅ Main lookup values service function (rest remains the same)
export async function getLookupValues(userEmail?: string): Promise<LookupValuesResult> {
  try {
    console.log(`📊 [LookupValuesService] Getting lookup values for: ${userEmail || 'anonymous'}`);
    
    // ✅ Fetch lookup data from S3
    const s3Response = await fetch('https://simsstoragereflkpdata.s3.amazonaws.com/lookupValues.json');
    
    if (!s3Response.ok) {
      throw new Error(`Failed to fetch lookup data: ${s3Response.status}`);
    }
    
    const lookupData = await s3Response.json();
    console.log('✅ [LookupValuesService] Successfully fetched lookup data from S3');
    
    // ✅ FIXED: Get filtered plant locations using hierarchy-mapping.json
    if (userEmail) {
      const accessiblePlants = await getAccessiblePlants(userEmail);
      lookupData["Plant Location"] = accessiblePlants; // ✅ This replaces the S3 data with filtered data
      console.log(`✅ [LookupValuesService] Applied plant filtering via hierarchy-mapping.json: ${accessiblePlants.length} plants`);
      console.log(`📋 [LookupValuesService] Filtered plants: ${accessiblePlants.slice(0, 5).join(', ')}${accessiblePlants.length > 5 ? '...' : ''}`);
    } else {
      console.log(`⚠️ [LookupValuesService] No user email provided - using unfiltered plant data`);
    }
    
    return {
      success: true,
      userEmail: userEmail || '',
      plantLocationCount: lookupData["Plant Location"]?.length || 0,
      plantLocations: lookupData["Plant Location"] || [],
      "Employee Type": lookupData["Employee Type"] || [],
      "Age Range": lookupData["Age Range"] || [],
      "Experience at ITW": lookupData["Experience at ITW"] || [],
      "Experience in Role": lookupData["Experience in Role"] || [],
      "Plant Location": lookupData["Plant Location"] || [], // ✅ Now filtered by hierarchy-mapping.json
      "Work Activity Type": lookupData["Work Activity Type"] || [],
      "Injury Type": lookupData["Injury Type"] || [],
      "Injured Body Part": lookupData["Injured Body Part"] || [],
      "Incident Type": lookupData["Incident Type"] || [],
      "Where Did This Occur": lookupData["Where Did This Occur"] || [],
      "Type of Concern": lookupData["Type of Concern"] || [],
      "Priority Types": lookupData["Priority Types"] || [],
      "Root Cause": lookupData["Root Cause"] || [],
      "Direct Cause Groups": lookupData["Direct Cause Groups"] || [],
      "Direct Cause Group": lookupData["Direct Cause Group"] || {}
    };
    
  } catch (error) {
    console.error('❌ [LookupValuesService] Error getting lookup values:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return {
      success: false,
      userEmail: userEmail || '',
      plantLocationCount: 0,
      plantLocations: [],
      "Employee Type": [],
      "Age Range": [],
      "Experience at ITW": [],
      "Experience in Role": [],
      "Plant Location": [],
      "Work Activity Type": [],
      "Injury Type": [],
      "Injured Body Part": [],
      "Incident Type": [],
      "Where Did This Occur": [],
      "Type of Concern": [],
      "Priority Types": [],
      "Root Cause": [],
      "Direct Cause Groups": [],
      "Direct Cause Group": {},
      error: `Failed to get lookup values: ${errorMessage}`
    };
  }
}

// ✅ Cached version (rest remains the same)
const lookupValuesCache = new Map<string, LookupValuesResult>();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

export async function getCachedLookupValues(userEmail?: string): Promise<LookupValuesResult> {
  const cacheKey = userEmail || 'ANONYMOUS';
  const cached = lookupValuesCache.get(cacheKey);
  
  if (cached && cached.success && (Date.now() - (cached as any).timestamp) < CACHE_DURATION) {
    console.log('🚀 [LookupValuesService] Using cached data');
    return cached;
  }
  
  const freshData = await getLookupValues(userEmail);
  if (freshData.success) {
    (freshData as any).timestamp = Date.now();
    lookupValuesCache.set(cacheKey, freshData);
    console.log('💾 [LookupValuesService] Cached fresh data');
  }
  
  return freshData;
}

export function clearLookupValuesCache() {
  lookupValuesCache.clear();
  console.log('🗑️ [LookupValuesService] Cleared lookup values cache');
}
