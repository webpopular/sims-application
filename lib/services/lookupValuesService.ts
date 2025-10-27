// lib/services/lookupValuesService.ts - FIXED division matching logic
'use client';

import {generateClient} from 'aws-amplify/data';
import {type Schema} from "@/amplify/data/schema";
import {getUserAccess} from './userAccessService';
import hierarchyMapping from '../../hierarchy-mapping.json';
import hierarchyAliases from '../../hierarchy-aliases.json';

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

function resolveHierarchyAlias(userHierarchy: string): string {
  if (!userHierarchy) return userHierarchy;
  const normalized = userHierarchy.replace(/\s+/g, '').toLowerCase();

  const sortedAliases = Object.entries(hierarchyAliases).sort(
      ([a], [b]) => b.length - a.length // longer (more specific) aliases first
  );

  for (const [aliasKey, canonical] of sortedAliases) {
    const aliasNorm = aliasKey.replace(/\s+/g, '').toLowerCase();

    if (
        normalized.endsWith(aliasNorm) ||   // suffix match
        normalized.includes(aliasNorm)      // partial match
    ) {
      const basePrefix = userHierarchy.startsWith('ITW>') && !canonical.startsWith('ITW>')
          ? 'ITW>'
          : '';
      const resolved = `${basePrefix}${canonical}`;
      console.log(`✅ [HierarchyAlias] Mapped "${userHierarchy}" → "${resolved}"`);
      return resolved;
    }
  }

  console.warn(`⚠️ [HierarchyAlias] No alias found for "${userHierarchy}"`);
  return userHierarchy;
}

function extractPlantsByDivision(hierarchy: any, divisionName: string): string[] {
  const result: string[] = [];
  if (!divisionName) return [];

  try {
    const segments = hierarchy?.segments || {};
    const cleanDivision = divisionName.trim().toLowerCase();

    console.log(`🔍 [LookupValuesService] Searching for division: "${cleanDivision}"`);

    for (const segmentKey in segments) {
      const platforms = segments[segmentKey]?.platforms || {};

      for (const platformKey in platforms) {
        const divisions = platforms[platformKey]?.divisions || {};

        for (const divKey in divisions) {
          const divKeyClean = divKey.replace(/>$/g, '').trim().toLowerCase();

          // ✅ Match if division name appears anywhere near the end
          if (
              divKeyClean.endsWith(cleanDivision) ||                  // exact at end
              divKeyClean.includes(`>${cleanDivision}`) ||            // after >
              divKeyClean.includes(`${cleanDivision} `) ||            // "Deltar NA"
              divKeyClean.includes(cleanDivision)                     // loose fallback
          ) {
            const plants = divisions[divKey];
            if (Array.isArray(plants)) {
              result.push(...plants);
              console.log(`✅ [LookupValuesService] Division match: ${divKey} -> ${plants.length} plants`);
            }
          }
        }
      }
    }

    if (result.length === 0) {
      console.warn(`⚠️ [LookupValuesService] No match for division "${divisionName}", returning all plants for debugging`);
      return extractAllPlantsFromMapping(hierarchy);
    }

    return [...new Set(result)].sort();

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
    const cleanPlatformName = platformName.toLowerCase().replace(/\s+/g, '');

    console.log(`🔍 [LookupValuesService] Looking for platform: "${cleanPlatformName}"`);

    for (const segmentKey in segments) {
      const platforms = segments[segmentKey]?.platforms || {};

      for (const platKey in platforms) {
        const platKeyClean = platKey.toLowerCase().replace(/\s+/g, '');

        // ✅ match loosely by name (handles "Components" vs "Plastic Fasteners")
        if (
            platKeyClean.includes(cleanPlatformName) ||
            cleanPlatformName.includes(platKeyClean)
        ) {
          const regions = platforms[platKey]?.regions || {};

          for (const regionKey in regions) {
            const divisions = regions[regionKey]?.divisions || {};

            for (const divKey in divisions) {
              const plants = divisions[divKey];
              if (Array.isArray(plants)) {
                result.push(...plants);
                console.log(
                    `✅ [LookupValuesService] Found region "${regionKey}" → division "${divKey}" → ${plants.length} plants`
                );
              }
            }
          }
        }
      }
    }

    return [...new Set(result)].sort(); // remove duplicates + sort

  } catch (error) {
    console.error('❌ [LookupValuesService] Error extracting plants by platform:', error);
    return [];
  }
}

// ✅ FIXED: Extract plants by segment with proper key matching
function extractPlantsBySegment(hierarchy: any, segmentName: string): string[] {
  const result: string[] = [];
  const cleanSegmentName = segmentName.toLowerCase().replace(/\s+/g, '');

  for (const segKey in hierarchy?.segments || {}) {
    if (segKey.toLowerCase().includes(cleanSegmentName)) {
      const platforms = hierarchy.segments[segKey]?.platforms || {};
      for (const platKey in platforms) {
        const regions = platforms[platKey]?.regions || {};
        for (const regionKey in regions) {
          const divisions = regions[regionKey]?.divisions || {};
          for (const divKey in divisions) {
            const plants = divisions[divKey];
            if (Array.isArray(plants)) result.push(...plants);
          }
        }
      }
    }
  }

  return [...new Set(result)].sort();
}

// ✅ Extract all plants from hierarchy mapping
function extractAllPlantsFromMapping(hierarchy: any): string[] {
  const allPlants: string[] = [];

  try {
    const segments = hierarchy?.segments || {};

    for (const segmentKey in segments) {
      const platforms = segments[segmentKey]?.platforms || {};

      for (const platformKey in platforms) {
        const regions = platforms[platformKey]?.regions || {};

        for (const regionKey in regions) {
          const divisions = regions[regionKey]?.divisions || {};

          for (const divisionKey in divisions) {
            const plants = divisions[divisionKey] || [];
            if (Array.isArray(plants)) {
              allPlants.push(...plants);
            }
          }
        }
      }
    }

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

// ✅ Improved division resolver: fuzzy + nested matching
function findClosestDivisionPlants(hierarchyMapping: any, userHierarchy: string): string[] {
  try {
    if (!userHierarchy) return [];
    const hierarchyParts = userHierarchy.split('>').filter(Boolean).map(p => p.toLowerCase());
    const targetDivision = hierarchyParts[hierarchyParts.length - 1]; // e.g., "deltar"
    const targetPlatform = hierarchyParts[hierarchyParts.length - 2] || '';
    const targetSegment = hierarchyParts[hierarchyParts.length - 3] || '';

    const results: string[] = [];

    const segments = hierarchyMapping.segments || {};
    for (const segKey in segments) {
      const segNode = segments[segKey];
      if (!segNode?.platforms) continue;

      const segMatch =
          segKey.toLowerCase().includes(targetSegment) ||
          targetSegment.includes(segKey.toLowerCase());

      for (const platKey in segNode.platforms) {
        const platNode = segNode.platforms[platKey];
        if (!platNode?.divisions) continue;

        const platMatch =
            segMatch &&
            (platKey.toLowerCase().includes(targetPlatform) ||
                targetPlatform.includes(platKey.toLowerCase()));

        for (const divKey in platNode.divisions) {
          const divMatch =
              platMatch &&
              (divKey.toLowerCase().includes(targetDivision) ||
                  targetDivision.includes(divKey.toLowerCase()));

          if (divMatch && Array.isArray(platNode.divisions[divKey])) {
            results.push(...platNode.divisions[divKey]);
          }
        }
      }
    }

    console.log(
        `✅ [LookupValuesService] Found ${results.length} plants for fuzzy division match "${targetDivision}"`
    );
    return [...new Set(results)].sort();
  } catch (err) {
    console.error('❌ [LookupValuesService] Error in findClosestDivisionPlants:', err);
    return [];
  }
}

// ✅ Smart fuzzy division match - handles "Automotive" vs "Automotive OEM" etc.
function findMatchingDivisionPlants(hierarchyMapping: any, userHierarchy: string): string[] {
  try {
    if (!userHierarchy) return [];

    const normalize = (s: string) =>
        s.toLowerCase().replace(/\s+/g, '').replace(/^itw>/, '').replace(/>$/g, '');

    const parts = userHierarchy.split('>').filter(Boolean).map(normalize);
    const targetDivision = parts.at(-1) || '';   // deltarna
    const targetRegion   = parts.at(-2) || '';   // northamerica
    const targetPlatform = parts.at(-3) || '';   // plasticfasteners
    const targetSegment  = parts.at(-4) || '';   // automotiveoem

    const results: string[] = [];

    const segments = hierarchyMapping?.segments || {};
    for (const segKey in segments) {
      const segNode = segments[segKey];
      if (!segNode?.platforms) continue;

      const segMatch =
          normalize(segKey).includes(targetSegment) ||
          targetSegment.includes(normalize(segKey));

      for (const platKey in segNode.platforms) {
        const platNode = segNode.platforms[platKey];
        if (!platNode?.regions) continue;

        const platMatch =
            segMatch &&
            (normalize(platKey).includes(targetPlatform) ||
                targetPlatform.includes(normalize(platKey)));

        for (const regKey in platNode.regions) {
          const regNode = platNode.regions[regKey];
          if (!regNode?.divisions) continue;

          const regMatch =
              platMatch &&
              (normalize(regKey).includes(targetRegion) ||
                  targetRegion.includes(normalize(regKey)));

          for (const divKey in regNode.divisions) {
            const divNode = regNode.divisions[divKey];
            if (!Array.isArray(divNode)) continue;

            const divMatch =
                regMatch &&
                (
                    normalize(divKey).endsWith(targetDivision) ||
                    normalize(divKey).includes(`>${targetDivision}`) ||
                    normalize(divKey).includes(targetDivision)
                );

            if (divMatch) {
              results.push(...divNode);
              console.log(
                  `✅ [LookupValuesService] Matched division "${divKey}" under region "${regKey}" → ${divNode.length} plants`
              );
            }
          }
        }
      }
    }

    console.log(
        `✅ [LookupValuesService] Found ${results.length} plants for resolved hierarchy "${userHierarchy}"`
    );
    if (results.length === 0) {
      console.warn(`⚠️ [LookupValuesService] No direct division match for "${targetDivision}". Trying full path lookup...`);
      const fullKey = userHierarchy.trim().replace(/\s+/g, '');
      for (const segKey in segments) {
        const platforms = segments[segKey]?.platforms || {};
        for (const platKey in platforms) {
          const regions = platforms[platKey]?.regions || {};
          for (const regKey in regions) {
            const divisions = regions[regKey]?.divisions || {};
            for (const divKey in divisions) {
              if (divKey.replace(/\s+/g, '').includes(fullKey)) {
                const plants = divisions[divKey];
                if (Array.isArray(plants)) results.push(...plants);
                console.log(`✅ [LookupValuesService] Full path matched "${divKey}" → ${plants.length} plants`);
              }
            }
          }
        }
      }
    }
    return [...new Set(results)];
  } catch (err) {
    console.error('❌ [LookupValuesService] Error in findMatchingDivisionPlants:', err);
    return [];
  }
}

// ✅ FIXED: Get accessible plants using proper hierarchy-mapping.json structure
async function getAccessiblePlants(userEmail: string) {

  try {
    console.log(`🏭 [LookupValuesService] Getting plants for: ${userEmail}`);
    
    const userAccess = await getUserAccess(userEmail);
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
    const resolvedHierarchy = resolveHierarchyAlias(userAccess.hierarchyString);
    if (resolvedHierarchy !== userAccess.hierarchyString) {
      console.log(`✅ [LookupValuesService] Using resolved alias hierarchy: ${resolvedHierarchy}`);
    }
    
    // ✅ Fetch hierarchy mapping from S3
   //  const hierarchyResponse = await fetch('https://simsstoragereflkpdata.s3.amazonaws.com/hierarchy-mapping.json');
    const hierarchyResponse = hierarchyMapping;
    
    // if (!hierarchyResponse.ok) {
    //   throw new Error(`Failed to fetch hierarchy mapping: ${hierarchyResponse.status}`);
    // }
    
    // const hierarchyMapping = await hierarchyResponse.json();
    console.log('✅ [LookupValuesService] Successfully fetched hierarchy mapping from S3');
    console.log('[DEBUG] Raw division from userAccess:', userAccess.division);
    // console.log('[DEBUG] Example division keys:',
    //     Object.keys(
    //         hierarchyMapping?.segments?.["ITW>Automotive OEM>"]?.platforms?.["ITW>Automotive OEM>Plastic Fasteners>"]?.divisions || {}
    //     )
    // );

    let accessiblePlants: string[] = [];

    switch (userAccess.accessScope) {
      case 'ENTERPRISE':
        console.log(`🌐 [LookupValuesService] Enterprise access - showing all plants`);
        accessiblePlants = extractAllPlantsFromMapping(hierarchyMapping);
        break;

      case 'SEGMENT':
        console.log(`🏭 [LookupValuesService] Segment access - filtering by segment: ${userAccess.segment}`);
        accessiblePlants = extractPlantsBySegment(hierarchyMapping, userAccess.segment || '');
        break;

      case 'PLATFORM':
        console.log(`🏗️ [LookupValuesService] Platform access - filtering by platform: ${userAccess.platform}`);
        accessiblePlants = extractPlantsByPlatform(hierarchyMapping, userAccess.platform || '');
        break;

      case 'DIVISION':
        console.log(`🏢 [LookupValuesService] Division access - filtering by division: ${userAccess.division}`);
        accessiblePlants = findMatchingDivisionPlants(hierarchyMapping, resolvedHierarchy.replace(/>[^>]+$/, '') || '');
        break;

      case 'PLANT':
        console.log(`🏭 [LookupValuesService] Plant access - showing only user's plant: ${userAccess.plant}`);
        accessiblePlants = getPlantsForUser(hierarchyMapping, userAccess.plant || '');
        // ✅ For plant-level users, skip further division matching
        return accessiblePlants;

    }
    if (!accessiblePlants.length) {
      console.warn(`⚠️ [LookupValuesService] No plants matched for "${resolvedHierarchy}". Falling back to fuzzy division search.`);
      accessiblePlants = extractAllPlantsFromMapping(hierarchyMapping)
          .filter(p => p.toLowerCase().includes((userAccess.division || '').toLowerCase()));
    }
    console.log(`✅ [LookupValuesService] Found ${accessiblePlants.length} accessible plants for user`);
    console.log(`📋 [LookupValuesService] Plants: ${accessiblePlants.slice(0, 5).join(', ')}${accessiblePlants.length > 5 ? '...' : ''}`);
    let finalHierarchy = resolvedHierarchy;

    if (!accessiblePlants.length) {
      if (!resolvedHierarchy.toLowerCase().includes((userAccess.division || '').toLowerCase())) {
        finalHierarchy = `${resolvedHierarchy}>${userAccess.division}`;
        console.log(`⚙️ [LookupValuesService] Appended missing division to hierarchy: ${finalHierarchy}`);
      }

      // only run this fallback if earlier logic returned nothing
      console.log('🔁 [LookupValuesService] Retrying division match as fallback...');
      accessiblePlants = findMatchingDivisionPlants(hierarchyMapping, finalHierarchy || '');
    }

    return [...new Set(accessiblePlants)];

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

export async function getCachedLookupValues(
    userEmail?: string,
    filters?: { division?: string; platform?: string; plant?: string; accessScope?: string }
): Promise<LookupValuesResult> {
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
