// app/types/index.ts

// Common interfaces used across forms

export type SubmissionStatus = 
  | 'Draft'
  | 'Not Viewed'
  | 'Pending Review'
  | 'Rejected'
  | 'Approved'
  | 'Incident with RCA - Open'
  | 'Observation with RCA - Open';

  //not used !?

  export enum EventApprovalEnum {
    NotStarted = 'YET_TO_START', 
    SendBack = 'SEND_BACK',   
    InProgress = 'ACTION_IN_PROGRESS',
    Complete = 'ACTION_COMPLETE'
  }
  

      export interface InjuryFormData {
        id?: string;  // PK for update
        submissionId: string;
        recordType: string;
        dateOfIncident?: string;
        timeOfIncident?: string;
        timeOfIncidentHour: string;
        timeOfIncidentMinute: string;
        timeOfInjuryAmPm: string;
        timeEmployeeBegan: string;
        timeEmployeeBeganAmPm: string;
        incidentLocation: string;
        division?: string;
        platform?: string;
        employeeType: string;
        ageRange: string;
        tenure: string;
        experience: string;
        title?: string;
        locationOnSite: string;
        whereDidThisOccur: string;
        workAreaDescription: string;
        workActivityCategory: string;
        incidentDescription: string;
        injuryDescription: string;
        activityType: string;
        injuryType: string[];
        injuredBodyPart: string[];
        incidentType: string;
        estimatedLostWorkDays?: number; // Optional for Global
        injuryCategory?: string; // Optional for Global
        incidentCategory?: string; // Optional for Global
        isCovidRelated: string;
        isRestrictedWork: string;
        isJobTransfer: string;
        finalDaysAway: number;
        createdAt: string;
        updatedAt: string;
        investigationStatus?: string;
        status: SubmissionStatus;
        location: string;
        submissionType: 'Direct' | 'QR Code';
      
        OSHArecordableType?: string;
        caseClassification?: string;
        injuryIllness?: string;
      
      
        // US-Specific Fields (Optional)

        employeeId?: string; 
        firstName?: string; 
        lastName?: string; 
        streetAddress?: string; 
        city?: string; 
        state?: string; 
        zipCode?: string; 
        phoneNumber?: string; 
        dateOfBirth?: string; 
        sex?: string; 
        dateHired?: string;
      
        // Additional Fields
        documents?: Document[]; 
        interimCorrectiveActions?: InterimCorrectiveAction[]; // Allow multiple corrective actions
        rca?: RCA[];
        finalCorrectiveAction?: FinalCorrectiveAction[];
        lessonsLearned?: LessonsLearned[];
        lessonsLearnedFlag?: boolean;
        
        eventApprovaldueDate?: string;
        eventApprovalassignedTo?: string;
        //eventApprovalStatus: EventApprovalEnum,
        eventApprovalStatus: 'YET_TO_START' | 'ACTION_IN_PROGRESS' | 'ACTION_COMPLETE' | 'SEND_BACK';
        eventApprovalDescription?: string;
        eventApprovalNotes?: string;
        eventApprovaluploadedAt?: string;
        eventApprovaluploadedBy?: string;

          //safetyalert
          saNumber: string;
          saLocation: string;
          saWhereInPlant: string;
          saAdditionalDetail: string;
          saAuthor: string;
          saInjuryFlag: boolean;
          saPropertyDamageFlag: boolean;
          saIncidentDescripotion: string;
          saActionAndNextSteps: string;
          saImageBefore: string;
          saImageAfter: string;
          saCreateDate: string;
          saUpdateDate: string;
          saStatus: 'NONE' | 'SAFETY_ALERT_OPEN' |'SAFETY_ALERT_NOT_CREATED'|'SAFETY_ALERT_CREATED';
          saPDF?: string;

          quickFixWasthisIncidentIventigated?: boolean;
          quickFixDescribeCorrectiveActions?: string;
          quickFixDirectCauseGroup?: string;
          quickFixSubGroup?: string;
          quickFixRootCause?: string; 
          quickFixUpdatedAt?: string;
          quickFixUpdatedBy?: string; 
          quickFixDueDate?: string; 
          quickFixAssignTo?: string; 
          quickFixStatus?: string; //Assigned, Completed
          quickFixNotes?: string; 

          //Observation
          obsTypeOfConcern?: string; 
          obsPriorityType?: string; 
          obsCorrectiveAction?: string; 

      }

export interface Document { 
    docId: string,   
    fileName: string;
    s3Key: string;
    uploadedAt: string;
    uploadedBy: string;
    size: number;
    type: string;
    hasPII: boolean;
  }
  
  export interface SectionState {
    documents: boolean;
    investigation: boolean;
    classification: boolean;
    safetyAlert: boolean;
    interimCorrectiveActions: boolean;
    rca: boolean;
    finalCorrectiveAction: boolean;
    lessonsLearned: boolean;
    eventApprovalSection: boolean;
  }
  
  export interface ReferenceDataItem {
    id: string | null;
    category?: string;
    value: string;
    label: string;
    isActive?: boolean;
    createdAt?: string;
    createdBy?: string;
    order?: number | null;
    updatedAt?: string | null;
    updatedBy?: string | null;
    owner?: string | null;
    metadata?: any | null;
  }
  
  export interface SubmissionResult {
    success: boolean;
    reportId?: string;
  }
  
  export interface UpdateSubmissionData {
    id: string | undefined;
    submissionId: string;
    recordType: string;
    status: string;
    updatedAt: string;
    updatedBy: string;
    caseClassification?: string;
    injuryIllness?: string;
  }
   

  export interface UpdateFields {
    id: string;
    submissionId: string;
    recordType: string;
    status: string;
    updatedAt: string;
    updatedBy: string;
    owner: string;
    estimatedLostWorkDays?: number;
    OSHArecordableType?: string;
    caseClassification?: string;
    injuryIllness?: string;
    documents?: Document[]; //  optional
    interimCorrectiveActions?: InterimCorrectiveAction[]; //  optional
  }
  
  

  export interface InjuryFormPropsxxxx {
    mode: 'create' | 
          'edit' | 
          'investigate' |
          'investigate-injuryform' |
          'investigate-observationform' | // Add this new mode
          'investigate-classification' |          
          'investigate-documents' |
          'investigate-safetyalert' |
          'investigate-interimcorrectiveactions' |
          'investigate-rca' |
          'investigate-finalcorrectiveactions' |
          'investigate-lessonslearned' |
          'investigate-incidentclosure';
    formType: 'US' | 'Global'; // Keep this as is, without adding 'Observation'
    initialData?: InjuryFormData;
    submissionId?: string;
    title?: string;
    recordType?: 'INJURY_REPORT' | 'OBSERVATION_REPORT'; // Add recordType to distinguish between report types
  }
  

  export interface InjuryFormProps {
    mode: 'create' | 
          'edit' | 
          'investigate' |
          'investigate-injuryform' |
          'investigate-observationform' | // Add this new mode
          'investigate-classification' |          
          'investigate-documents' |
          'investigate-safetyalert' |
          'investigate-interimcorrectiveactions' |
          'investigate-rca' |
          'investigate-finalcorrectiveactions' |
          'investigate-lessonslearned' |
          'investigate-incidentclosure';
    formType: 'US' | 'Global'; // Keep this as is, without adding 'Observation'
    //initialData?: InjuryFormData;
    initialData?: Partial<InjuryFormData> | undefined;
    submissionId?: string;
    title?: string;
    recordType?: 'INJURY_REPORT' | 'OBSERVATION_REPORT'; // Add recordType to distinguish between report types
    onSuccess?: () => void;
  }

  
  //temp interface
  export interface IncidentClosure {
    closureId: string;  // Unique identifier for the incident closure record
    closureDate: string;  // Date of closure
    closedBy: string;  // Person responsible for closing the incident
    closureSummary: string;  // Brief summary of closure details
    correctiveActionsVerified: boolean;  // Whether corrective actions were verified
    comments?: string;  // Optional additional comments
    uploadedAt?: string;  // Timestamp of when the record was uploaded
    uploadedBy?: string;  // Username of the uploader
  }
  
  
  export interface InterimCorrectiveAction {
    icaId: string;
    dueDate?: string;
    assignedTo?: string;
    icaStatus: 'YET_TO_BEGIN' | 'ACTION_IN_PROGRESS' |'ACTION_COMPLETE_AND_FINAL'|'ACTION_COMPLETE_STOP_GAP';
    actionDescription?: string;
    uploadedAt: string;
    uploadedBy: string;
  }
 
 

  export interface FinalCorrectiveAction {
    fcaId: string;
    dueDate?: string;
    assignedTo?: string;
    fcaStatus: 'YET_TO_BEGIN' | 'ACTION_IN_PROGRESS' | 'ACTION_COMPLETE';
    actionDescription?: string;
    actionNotes?: string;
    uploadedAt: string;
    uploadedBy: string;
  }
 

 //RCA
  export interface RCA{
    rcaId: string;
    rcaDirectCauseWho?: string;
    rcaDirectCauseWhen?: string;
    rcaDirectCauseWhere?: string;
    rcaDirectCauseWhat?: string;
    rcaDirectCauseHow?: string;
    rcaDirectCauseGroup?: string;
    rcaDirectCauseSubGroup?: string;
    rcaIdentifyDirectCause?: string;
    rcaRootCauseWhy1?: string;
    rcaRootCauseWhy2?: string;
    rcaRootCauseWhy3?: string;
    rcaRootCauseWhy4?: string;
    rcaRootCauseWhy5?: string;
    isRCAComplete?: string;
    uploadedAt: string;
    uploadedBy: string;
    rcaUploadedDocuments?: rcaDocuments[];
    //rcaStatus?: 'NOT_STARTED' | 'ACTION_IN_PROGRESS' | 'ACTION_COMPLETE';
    rcaStatus?: string;
  }
   
  export interface rcaDocuments {
    docId: string;
    fileName: string;
    s3Key: string;
    uploadedAt: string;
    uploadedBy: string;
    size: number;
    type: string;
  }


  //LessonsLearned
  export interface llDocuments {
    docId: string;
    fileName: string;
    s3Key: string;
    uploadedAt: string;
    uploadedBy: string;
    size: number;
    type: string;
  }
  export interface LessonsLearned {
    llid: string;
    lessonsLearnedAuthor?: string;
    lessonsLearnedTitle?: string;
    lessonsLearnedSegment?: string;
    lessonsLearnedLocation?: string;
    lessonsLearnedKeyWords?: string;
    lessonsLearnedDocuments?: llDocuments[];
    lessonsLearnedApprover?: string;
    lessonsLearnedApproverEmail?: string;
    lessonDescription?: string;
    keyTakeaways?: string;
    uploadedAt: string;
    uploadedBy: string;
    // ✅ Approval fields
    lessonsLearnedApprovalStatus: 'LL_NOT_SENT'| 'LL_SENT_FOR_APPROVAL'| 'LL_APPROVED' | 'LL_SENT_BACK_FOR_REVISION';
    lessonsLearnedSentforApprovalBy?: string; // user email/username
    lessonsLearnedSentforApprovalAt?: string; // ISO timestamp
    lessonsLearnedSenttoApprover?: string;// dropdown value    
  }

  export interface Recognition {
    id: string;
  
    recognitionId: string | null;
    yourName?: string| null;
    yourEmployeeId?: string| null;
    recognizedPersonName?: string| null;
  
    safetyFocused?: boolean| null;
    continualImprovement?: boolean| null;
    focus8020?: boolean| null;
    entrepreneurialCulture?: boolean| null;
    attitudeFocused?: boolean| null;
    peopleFocused?: boolean| null;
    detailFocused?: boolean| null;
    employeeStory?: string| null;
    
    mediaUploadUrl?: string| null;
    thumbnailS3Key?: string| null;
    photoSize?: string| null;
    photoType?: string| null;
    contactRequested?: boolean| null;
    contactPhoneNumber?: string| null;
  
    createdAt: string;  // ISO date string
    createdBy: string;
  
    updatedAt?: string| null;
    updatedBy?: string| null;
  
    //metadata?: Record<string, any>; // Or you can specify a stricter type if needed
     metadata?: any | null;
  }

  

  
  export function mapApiResponseToInjuryFormData(data: any): InjuryFormData {
    return {
      ...data,
      // Handle all array fields
      documents: (data.documents || []).filter(Boolean) as Document[],
      //classification: (data.classification || []).filter(Boolean) as Classification[],
      interimCorrectiveActions: (data.interimCorrectiveActions || []).filter(Boolean) as InterimCorrectiveAction[],
      rca: (data.rca || []).filter(Boolean) as RCA[],
      finalCorrectiveAction: (data.finalCorrectiveAction || []).filter(Boolean) as FinalCorrectiveAction[],
      eventApprovalStatus: data.eventApprovalStatus || EventApprovalEnum.NotStarted,

      // Handle required string fields
      dateOfIncident: data.dateOfIncident || '',
      timeOfIncident: data.timeOfIncident || '',
      status: data.status || 'Not Viewed',
      location: data.location || 'TBD',
      submissionType: data.submissionType || 'Direct',
      
      // Handle US-specific defaults
      ...(data.submissionId?.startsWith('US-') && {
        employeeId: data.employeeId || '',
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        streetAddress: data.streetAddress || '',
        city: data.city || '',
        state: data.state || '',
        zipCode: data.zipCode || '',
        phoneNumber: data.phoneNumber || '',
        dateOfBirth: data.dateOfBirth || '',
        sex: data.sex || '',
        dateHired: data.dateHired || ''
      })
    };
  }