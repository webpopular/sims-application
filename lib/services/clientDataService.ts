// lib/services/clientDataService.ts - ENHANCED VERSION
import { type Schema } from "@/amplify/data/schema";
import { generateClient } from "aws-amplify/api";

export class ClientDataService {
  static async getFilteredSubmissions(userAccess: any) {
    const client = generateClient<Schema>();
    
    console.log(`🔍 [ClientDataService] Fetching data for ${userAccess.accessScope} user:`, userAccess.email);
    console.log(`🔍 [ClientDataService] User hierarchy:`, userAccess.hierarchyString);
    
    // Use the same query as your working InjuryList
    const response = await client.models.Submission.list({
      selectionSet: [
        'id', 'submissionId', 'recordType', 'hierarchyString', 'createdBy',
        'createdAt', 'status', 'location', 'locationOnSite', 'title',
        'incidentDescription', 'dateOfIncident', 'owner', 'updatedAt'
      ]
    });
    
    const allData = response.data || [];
    console.log(`✅ [ClientDataService] Fetched ${allData.length} total submissions`);
    
    // Apply client-side filtering based on user access
    const filteredData = this.applyHierarchyFilter(allData, userAccess);
    console.log(`✅ [ClientDataService] Filtered to ${filteredData.length} submissions for user`);
    
    return filteredData;
  }
  
  static applyHierarchyFilter(data: any[], userAccess: any) {
    console.log(`🔍 [HierarchyFilter] Applying ${userAccess.accessScope} level filtering`);
    
    switch (userAccess.accessScope) {
      case 'ENTERPRISE':
        console.log(`✅ [HierarchyFilter] Enterprise access - returning all ${data.length} records`);
        return data; // See all data
        
      case 'SEGMENT':
      case 'PLATFORM':
      case 'DIVISION':
        const beginsWith = data.filter(item => 
          item.hierarchyString?.startsWith(userAccess.hierarchyString)
        );
        console.log(`✅ [HierarchyFilter] ${userAccess.accessScope} access - filtered to ${beginsWith.length} records`);
        return beginsWith;
        
      case 'PLANT':
        const exactMatch = data.filter(item => 
          item.hierarchyString === userAccess.hierarchyString
        );
        console.log(`✅ [HierarchyFilter] Plant access - filtered to ${exactMatch.length} records`);
        return exactMatch;
        
      default:
        console.log(`⚠️ [HierarchyFilter] Unknown access scope - applying restrictive filtering`);
        return data.filter(item => 
          item.hierarchyString === userAccess.hierarchyString
        );
    }
  }
}
