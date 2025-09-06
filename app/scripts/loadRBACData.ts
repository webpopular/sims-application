// scripts/loadRBACData.ts
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/schema';
import * as XLSX from 'xlsx';

const client = generateClient<Schema>();

// ✅ Add the missing mapping function
function mapRoleToCognitoGroup(roleTitle: string, level: number): string {
  const roleMapping: Record<string, string> = {
    'ITW Leadership': 'ENTERPRISE',
    'ITW Safety Director': 'ENTERPRISE',
    'Segment Leadership': 'SEGMENT', 
    'Segment Safety Director': 'SEGMENT',
    'Group President': 'PLATFORM_GROUP_PRESIDENT',
    'Platform HR Director': 'PLATFORM_HR',
    'VP/GM/BUM': 'DIVISION_VP_GM_BUM',
    'Operations Director': 'DIVISION_OPS_DIRECTOR',
    'Divisional HR Director': 'DIVISION_HR_DIRECTOR',
    'Divisional Safety Manager': 'DIVISION_SAFETY',
    'Plant Manager': 'DIVISION_PLANT_MANAGER',
    'Plant HR Manager': 'DIVISION_PLANT_HR',
    'Plant Safety Manager': 'DIVISION_SAFETY',
    'Plant Safety Champions': 'DIVISION_SAFETY',
    'Other': 'hr'
  };
  
  return roleMapping[roleTitle] || 'hr'; // Default fallback to hr group
}

async function loadRBACData() {
  console.log('Loading RBAC data from Excel...');
  
  try {
    const workbook = XLSX.readFile('./RBC-Tables.xlsx'); // Adjust path as needed
    
    // Load Role Permissions first
    await loadRolePermissions(workbook);
    
    // Then load User Role Assignments
    await loadUserRoles(workbook);
    
    console.log('✅ RBAC data loading completed successfully!');
  } catch (error) {
    console.error('❌ Error loading RBAC data:', error);
    throw error;
  }
}

async function loadRolePermissions(workbook: XLSX.WorkBook) {
  const permissionsSheet = XLSX.utils.sheet_to_json(workbook.Sheets['Permissions']);
  
  console.log('Loading role permissions...');
  
  for (const row of permissionsSheet as any[]) {
    const roleTitle = row['Titles (Do Not Edit)'];
    if (!roleTitle || roleTitle.trim() === '') continue;

    const permissionData = {
      roleTitle: roleTitle.trim(),
      canReportInjury: row['Report a New Injury via \nSIMS App'] === 'X',
      canReportObservation: row['Report an New Observation via SIMS App'] === 'X',
      canSafetyRecognition: row['Safety Recognition via SIMS App'] === 'X',
      canTakeFirstReportActions: row['Can Take First Report Actions'] === 'X',
      canViewPII: row['Can View PII'] === 'X',
      canTakeQuickFixActions: row['Can Take Quick Fix Actions'] === 'X',
      canTakeIncidentRCAActions: row['Can Take Incident with RCA Actions'] === 'X',
      canPerformApprovalIncidentClosure: row['Can perform an Approval for Incident Closure'] === 'X',
      canViewManageOSHALogs: row['Can View/Manage OSHA Logs (USA Only)'] === 'X',
      canViewOpenClosedReports: row['Can View Open And Closed Reports'] === 'X',
      canViewSafetyAlerts: row['Can View Safety Alerts'] === 'X',
      canViewLessonsLearned: row['Can View Lessons Learned'] === 'X',
      canViewDashboard: row['View Dashboard'] === 'X',
      canSubmitDSATicket: row['Can Submit at Ticket To DSA for Hierarchy Service'] === 'X',
      // ✅ Add required timestamp fields
      createdAt: new Date().toISOString(),
      createdBy: 'system-import',
      updatedAt: new Date().toISOString(),
      updatedBy: 'system-import'
    };

    try {
      await client.models.RolePermission.create(permissionData);
      console.log(`✅ Created permissions for role: ${roleTitle}`);
    } catch (error) {
      console.error(`❌ Error creating permissions for ${roleTitle}:`, error);
    }
  }
}

async function loadUserRoles(workbook: XLSX.WorkBook) {
  const userAssignmentsSheet = XLSX.utils.sheet_to_json(workbook.Sheets['ITW Auto Strings Assigned']);
  
  console.log('Loading user role assignments...');
  
  for (const row of userAssignmentsSheet as any[]) {
    const email = row['Email'];
    if (!email || email.trim() === '') continue;

    const level = parseInt(row['Level']) || 5;
    const roleTitle = (row['Role/Title'] || '').trim();

    const userData = {
      email: email.trim(),
      name: (row['Name '] || '').trim(),
      roleTitle: roleTitle,
      enterprise: (row['Enterprise'] || '').trim(),
      segment: (row['Segment '] || '').trim(),
      platform: (row['Platform'] || '').trim(),
      division: (row['Division'] || '').trim(),
      plant: (row['Plant'] || '').trim(),
      hierarchyString: (row['String'] || '').trim(),
      level: level,
      cognitoGroups: [mapRoleToCognitoGroup(roleTitle, level)],
      isActive: true,
      // ✅ Add required timestamp fields
      createdAt: new Date().toISOString(),
      createdBy: 'system-import',
      updatedAt: new Date().toISOString(),
      updatedBy: 'system-import'
    };

    try {
      await client.models.UserRole.create(userData);
      console.log(`✅ Created user role for: ${email} (${roleTitle})`);
    } catch (error) {
      console.error(`❌ Error creating user role for ${email}:`, error);
    }
  }
}

// ✅ Export the main function
export { loadRBACData };

// ✅ If running this script directly
if (require.main === module) {
  loadRBACData().catch(console.error);
}
