// lib/services/dataQueryService.ts - FIXED VERSION
import { generateClient } from 'aws-amplify/data';
import { type Schema } from "@/amplify/data/schema";
import { buildServerHierarchyFilter } from './serverDataFiltering'; // ✅ Use server-side version
import type { UserAccess } from '@/app/hooks/useUserAccess';

const client = generateClient<Schema>();

export class DataQueryService {
  static async getFilteredSubmissions(
    userAccess: UserAccess, 
    recordType?: string | null,
    additionalFilters?: any
  ) {
    const hierarchyFilter = buildServerHierarchyFilter(userAccess); // ✅ Use server-side function
    
    const filter: any = {
      ...hierarchyFilter,
      ...additionalFilters
    };
    
    // ✅ Handle null recordType properly
    if (recordType && recordType !== 'RECOGNITION') {
      filter.recordType = { eq: recordType };
    }
    
    console.log(`🔍 [DataQuery] Fetching submissions for ${userAccess.accessScope} user:`, userAccess.email);
    console.log(`🔍 [DataQuery] Applied filters:`, filter);
    
    try {
      const response = await client.models.Submission.list({
        filter,
        limit: 1000
      });
      
      console.log(`✅ [DataQuery] Found ${response.data?.length || 0} submissions`);
      return response.data || [];
      
    } catch (error) {
      console.error('❌ [DataQuery] Error fetching submissions:', error);
      throw error;
    }
  }

  static async getFilteredRecognitions(userAccess: UserAccess) {
    const hierarchyFilter = buildServerHierarchyFilter(userAccess); // ✅ Use server-side function
    
    console.log(`🔍 [DataQuery] Fetching recognitions for ${userAccess.accessScope} user`);
    
    try {
      const response = await client.models.Recognition.list({
        filter: hierarchyFilter,
        limit: 1000
      });
      
      console.log(`✅ [DataQuery] Found ${response.data?.length || 0} recognitions`);
      return response.data || [];
      
    } catch (error) {
      console.error('❌ [DataQuery] Error fetching recognitions:', error);
      throw error;
    }
  }

  // Specific query methods
  static async getInjuryReports(userAccess: UserAccess) {
    return this.getFilteredSubmissions(userAccess, 'INJURY_REPORT');
  }

  static async getObservationReports(userAccess: UserAccess) {
    return this.getFilteredSubmissions(userAccess, 'OBSERVATION_REPORT');
  }

  static async getSafetyRecognitions(userAccess: UserAccess) {
    return this.getFilteredSubmissions(userAccess, 'SAFETY_RECOGNITION');
  }
}
