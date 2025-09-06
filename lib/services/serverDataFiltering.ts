// lib/services/serverDataFiltering.ts - SERVER-SIDE VERSION
import type { UserAccess } from '@/app/hooks/useUserAccess';

export const buildServerHierarchyFilter = (userAccess: UserAccess) => {
  const { hierarchyString, level, accessScope } = userAccess;
  
  console.log(`🔍 [ServerDataFilter] Building filter for ${accessScope} user:`, userAccess.email);
  console.log(`🔍 [ServerDataFilter] User hierarchy:`, hierarchyString);
  
  switch (accessScope) {
    case 'ENTERPRISE':
      // Enterprise users (Level 1) can see ALL data
      console.log(`✅ [ServerDataFilter] Enterprise access - no restrictions`);
      return {}; // No filter = see everything
      
    case 'SEGMENT':
      // Segment users (Level 2) can see all data within their segment
      console.log(`✅ [ServerDataFilter] Segment access - filtering by segment`);
      return {
        hierarchyString: { beginsWith: hierarchyString }
      };
      
    case 'PLATFORM':
      // Platform users (Level 3) can see all data within their platform
      console.log(`✅ [ServerDataFilter] Platform access - filtering by platform`);
      return {
        hierarchyString: { beginsWith: hierarchyString }
      };
      
    case 'DIVISION':
      // Division users (Level 4) can see all data within their division
      console.log(`✅ [ServerDataFilter] Division access - filtering by division`);
      return {
        hierarchyString: { beginsWith: hierarchyString }
      };
      
    case 'PLANT':
      // Plant users (Level 5) can only see their plant's data
      console.log(`✅ [ServerDataFilter] Plant access - exact hierarchy match`);
      return {
        hierarchyString: { eq: hierarchyString }
      };
      
    default:
      // Restrictive fallback
      console.log(`⚠️ [ServerDataFilter] Unknown access scope - restricting to exact match`);
      return {
        hierarchyString: { eq: hierarchyString }
      };
  }
};
