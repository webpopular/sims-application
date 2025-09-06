//app/api/fetchSubmissionData.ts
import { type Schema } from "@/amplify/data/schema";
import { generateClient } from "aws-amplify/api";

const client = generateClient<Schema>();

/**
 * Fetch submission data based on `submissionId` and include all fields.
 */
export async function fetchSubmissionData(submissionId: string) {
    try {
        if (!submissionId) {
            console.error("❌ No submissionId provided!");
            return null;
        }

        console.log(`📌 Fetching submission data for submissionId: ${submissionId}`);

        const response = await client.models.Submission.list({
            filter: { submissionId: { eq: submissionId } }, // Filter by submissionId
            selectionSet: [
                // 🔹 Basic Submission Info
                'id', 'submissionId', 'recordType', 'division', 'platform', 'location',
                'incidentType', 'submissionType', 'title', 'createdAt', 'updatedAt', 'status',
                'investigationStatus',

                // 🔹 Incident & Injury Details
                'dateOfIncident', 'timeOfIncident', 'timeOfIncidentHour', 'timeOfIncidentMinute', 
                'timeOfInjuryAmPm', 'timeEmployeeBegan', 'timeEmployeeBeganAmPm',
                'incidentLocation', 'employeeType', 'ageRange', 'tenure', 'experience', 'title',
                'locationOnSite', 'whereDidThisOccur', 'workAreaDescription', 'workActivityCategory',
                'incidentDescription', 'injuryDescription', 'activityType', 'injuryType', 
                'injuredBodyPart', 'incidentType', 'estimatedLostWorkDays',
                'injuryCategory', 'incidentCategory', 'isCovidRelated',
                'isRestrictedWork', 'isJobTransfer', 'finalDaysAway',

                // 🔹 OSHA & Classification Details
                'OSHArecordableType', 'caseClassification', 'injuryIllness',

                // 🔹 User Information
                'employeeId', 'firstName', 'lastName', 'streetAddress', 'city', 'state',
                'zipCode', 'phoneNumber', 'dateOfBirth', 'sex', 'dateHired',

                // 🔹 Approval Workflow
                'eventApprovaldueDate', 'eventApprovalassignedTo', 'eventApprovalStatus',
                'eventApprovalDescription', 'eventApprovalNotes', 'eventApprovaluploadedAt',
                'eventApprovaluploadedBy',

                // 🔹 Documents & Corrective Actions
                'documents.*', 
                'interimCorrectiveActions.*', 
                'rca.*', 
                'finalCorrectiveAction.*',

                // 🔹 Rejection Details
                'rejectionReason', 'rejectedAt', 'rejectedBy',

                // Safety Alert
                'saNumber','saLocation','saWhereInPlant',
                'saAdditionalDetail','saAuthor','saInjuryFlag',
                'saPropertyDamageFlag','saIncidentDescripotion','saActionAndNextSteps',
                'saImageBefore','saImageAfter','saCreateDate',
                'saUpdateDate','saStatus', 'saPDF',
                
                'obsTypeOfConcern', 'obsPriorityType'


            ],
        });

        console.log("📌 API Response:", response);

        if (response.data && response.data.length > 0) {
            console.log("✅ Submission data found:", response.data[0]);
            return response.data[0]; // Return the first matching submission
        }

        console.warn("⚠️ No submission data found for this ID.");
        return null;
    } catch (error) {
        console.error("❌ Error fetching submission data:", error);
        return null;
    }
}
