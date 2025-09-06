// lib/services/plantLocationService.ts - NEW service for plant location hierarchy
'use client';

import { generateClient } from 'aws-amplify/data';
import { type Schema } from "@/amplify/data/schema";
import { getCachedUserAccess } from './userAccessService';

const client = generateClient<Schema>();

export interface PlantLocationResult {
  success: boolean;
  userEmail: string;
  accessScope: string;
  plantCount: number;
  plants: string[];
  hierarchyContext: {
    enterprise?: string;
    segment?: string;
    platform?: string;
    division?: string;
    plant?: string;
  };
  error?: string;
}

// ✅ Get plant locations based on hierarchy mapping
export async function getPlantLocations(userEmail?: string): Promise<PlantLocationResult> {
  try {
    console.log(`🏭 [PlantLocationService] Getting plant locations for: ${userEmail || 'anonymous'}`);
    
    // ✅ Fetch hierarchy mapping from S3
    const s3Response = await fetch('https://simsstoragereflkpdata.s3.amazonaws.com/hierarchy-mapping.json');
    
    if (!s3Response.ok) {
      throw new Error(`Failed to fetch hierarchy mapping: ${s3Response.status}`);
    }
    
    const hierarchyMapping = await s3Response.json();
    console.log('✅ [PlantLocationService] Successfully fetched hierarchy mapping from S3');
    
    // ✅ If no user email, return all plants
    if (!userEmail) {
      const allPlants = extractAllPlants(hierarchyMapping);
      return {
        success: true,
        userEmail: '',
        accessScope: 'ANONYMOUS',
        plantCount: allPlants.length,
        plants: allPlants,
        hierarchyContext: {}
      };
    }
    
    // ✅ Get user access for RBAC filtering
    const userAccess = await getCachedUserAccess(userEmail);
    if (!userAccess) {
      console.error('❌ [PlantLocationService] No user access found');
      return {
        success: false,
        userEmail,
        accessScope: 'UNKNOWN',
        plantCount: 0,
        plants: [],
        hierarchyContext: {},
        error: 'User access not found'
      };
    }
    
    console.log(`🏢 [PlantLocationService] User access scope: ${userAccess.accessScope}`);
    console.log(`🏢 [PlantLocationService] User hierarchy: ${userAccess.hierarchyString}`);
    
    // ✅ Get accessible plants based on user's access scope
    const accessiblePlants = getAccessiblePlantsFromMapping(hierarchyMapping, userAccess);
    
    console.log(`✅ [PlantLocationService] Found ${accessiblePlants.length} accessible plants for user`);
    console.log(`📋 [PlantLocationService] Plants: ${accessiblePlants.slice(0, 5).join(', ')}${accessiblePlants.length > 5 ? '...' : ''}`);
    
    return {
      success: true,
      userEmail,
      accessScope: userAccess.accessScope,
      plantCount: accessiblePlants.length,
      plants: accessiblePlants,
      hierarchyContext: {
        enterprise: userAccess.enterprise,
        segment: userAccess.segment,
        platform: userAccess.platform,
        division: userAccess.division,
        plant: userAccess.plant
      }
    };
    
  } catch (error) {
    console.error('❌ [PlantLocationService] Error getting plant locations:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return {
      success: false,
      userEmail: userEmail || '',
      accessScope: 'ERROR',
      plantCount: 0,
      plants: [],
      hierarchyContext: {},
      error: `Failed to get plant locations: ${errorMessage}`
    };
  }
}

// ✅ Extract all plants from hierarchy mapping
function extractAllPlants(hierarchyMapping: any): string[] {
  const allPlants: string[] = [];
  
  try {
    const segments = hierarchyMapping.segments || {};
    
    for (const segmentKey in segments) {
      const segment = segments[segmentKey];
      const platforms = segment.platforms || {};
      
      for (const platformKey in platforms) {
        const platform = platforms[platformKey];
        const divisions = platform.divisions || {};
        
        for (const divisionKey in divisions) {
          const plants = divisions[divisionKey];
          if (Array.isArray(plants)) {
            allPlants.push(...plants);
          }
        }
      }
    }
    
    // Remove duplicates and sort
    return [...new Set(allPlants)].sort();
    
  } catch (error) {
    console.error('❌ [PlantLocationService] Error extracting all plants:', error);
    return [];
  }
}

// ✅ Get accessible plants based on user access scope and hierarchy mapping
function getAccessiblePlantsFromMapping(hierarchyMapping: any, userAccess: any): string[] {
  try {
    const segments = hierarchyMapping.segments || {};
    let accessiblePlants: string[] = [];
    
    switch (userAccess.accessScope) {
      case 'ENTERPRISE':
        // Enterprise users see all plants
        console.log(`🌐 [PlantLocationService] Enterprise access - showing all plants`);
        accessiblePlants = extractAllPlants(hierarchyMapping);
        break;
        
      case 'SEGMENT':
        // Segment users see all plants in their segment
        console.log(`🏭 [PlantLocationService] Segment access - showing plants in segment: ${userAccess.segment}`);
        const segmentKey = `ITW>${userAccess.segment}>`;
        if (segments[segmentKey]) {
          const platforms = segments[segmentKey].platforms || {};
          for (const platformKey in platforms) {
            const platform = platforms[platformKey];
            const divisions = platform.divisions || {};
            for (const divisionKey in divisions) {
              const plants = divisions[divisionKey];
              if (Array.isArray(plants)) {
                accessiblePlants.push(...plants);
              }
            }
          }
        }
        break;
        
      case 'PLATFORM':
        // Platform users see all plants in their platform
        console.log(`🏗️ [PlantLocationService] Platform access - showing plants in platform: ${userAccess.platform}`);
        const platformKey = `ITW>${userAccess.segment}>${userAccess.platform}>`;
        
        for (const segmentKey in segments) {
          const segment = segments[segmentKey];
          const platforms = segment.platforms || {};
          if (platforms[platformKey]) {
            const divisions = platforms[platformKey].divisions || {};
            for (const divisionKey in divisions) {
              const plants = divisions[divisionKey];
              if (Array.isArray(plants)) {
                accessiblePlants.push(...plants);
              }
            }
          }
        }
        break;
        
      case 'DIVISION':
        // Division users see all plants in their division
        console.log(`🏢 [PlantLocationService] Division access - showing plants in division: ${userAccess.division}`);
        const divisionKey = `ITW>${userAccess.segment}>${userAccess.platform}>${userAccess.division}>`;
        
        for (const segmentKey in segments) {
          const segment = segments[segmentKey];
          const platforms = segment.platforms || {};
          for (const platformKey in platforms) {
            const platform = platforms[platformKey];
            const divisions = platform.divisions || {};
            if (divisions[divisionKey]) {
              const plants = divisions[divisionKey];
              if (Array.isArray(plants)) {
                accessiblePlants.push(...plants);
              }
            }
          }
        }
        break;
        
      case 'PLANT':
        // Plant users see only their specific plant(s)
        console.log(`🏭 [PlantLocationService] Plant access - showing only user's plant: ${userAccess.plant}`);
        
        // For plant users, we need to find their plant in the mapping
        // Since the mapping uses descriptive names, we need to match the user's plant
        const allPlants = extractAllPlants(hierarchyMapping);
        
        // Try to find exact match first
        const exactMatch = allPlants.find(plant => 
          plant.toLowerCase().includes(userAccess.plant.toLowerCase()) ||
          userAccess.plant.toLowerCase().includes(plant.toLowerCase())
        );
        
        if (exactMatch) {
          accessiblePlants = [exactMatch];
        } else {
          // Fallback: show plants that contain the user's plant name
          accessiblePlants = allPlants.filter(plant => 
            plant.toLowerCase().includes(userAccess.plant.toLowerCase()) ||
            userAccess.plant.toLowerCase().includes(plant.toLowerCase())
          );
        }
        break;
        
      default:
        console.warn(`⚠️ [PlantLocationService] Unknown access scope: ${userAccess.accessScope}`);
        accessiblePlants = [];
    }
    
    // Remove duplicates and sort
    return [...new Set(accessiblePlants)].sort();
    
  } catch (error) {
    console.error('❌ [PlantLocationService] Error getting accessible plants:', error);
    return [];
  }
}

// ✅ Cache for performance
const plantLocationCache = new Map<string, PlantLocationResult>();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

export async function getCachedPlantLocations(userEmail?: string): Promise<PlantLocationResult> {
  const cacheKey = userEmail || 'ANONYMOUS';
  const cached = plantLocationCache.get(cacheKey);
  
  if (cached && cached.success && (Date.now() - (cached as any).timestamp) < CACHE_DURATION) {
    console.log('🚀 [PlantLocationService] Using cached data');
    return cached;
  }
  
  const freshData = await getPlantLocations(userEmail);
  if (freshData.success) {
    (freshData as any).timestamp = Date.now();
    plantLocationCache.set(cacheKey, freshData);
    console.log('💾 [PlantLocationService] Cached fresh data');
  }
  
  return freshData;
}

// ✅ Clear cache function
export function clearPlantLocationCache() {
  plantLocationCache.clear();
  console.log('🗑️ [PlantLocationService] Cleared plant location cache');
}

// ✅ Helper function to get plants for a specific hierarchy level
export async function getPlantsForHierarchy(hierarchyString: string): Promise<string[]> {
  try {
    const s3Response = await fetch('https://simsstoragereflkpdata.s3.amazonaws.com/hierarchy-mapping.json');
    if (!s3Response.ok) {
      throw new Error(`Failed to fetch hierarchy mapping: ${s3Response.status}`);
    }
    
    const hierarchyMapping = await s3Response.json();
    const segments = hierarchyMapping.segments || {};
    
    // Parse hierarchy string to find matching plants
    const hierarchyParts = hierarchyString.split('>').filter(part => part.trim() !== '');
    
    if (hierarchyParts.length >= 4) {
      // This is a division level hierarchy
      const divisionKey = hierarchyString;
      
      for (const segmentKey in segments) {
        const segment = segments[segmentKey];
        const platforms = segment.platforms || {};
        for (const platformKey in platforms) {
          const platform = platforms[platformKey];
          const divisions = platform.divisions || {};
          if (divisions[divisionKey]) {
            return divisions[divisionKey] || [];
          }
        }
      }
    }
    
    return [];
    
  } catch (error) {
    console.error('❌ [PlantLocationService] Error getting plants for hierarchy:', error);
    return [];
  }
}
