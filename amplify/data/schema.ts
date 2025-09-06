// amplify/data/schema.ts
import { a, type ClientSchema } from '@aws-amplify/backend';

const schema = a.schema({

  Document: a.customType({
    docId: a.string().required(),  
    fileName: a.string().required(),
    s3Key: a.string().required(),
    uploadedAt: a.string().required(),
    uploadedBy: a.string().required(),
    size: a.integer().required(),
    type: a.string().required(),
    hasPII: a.boolean(),

  }),
 

  InterimCorrectiveAction: a.customType({
    icaId: a.string(),
    dueDate: a.string(),
    assignedTo: a.string(),
    icaStatus: a.enum([
      'YET_TO_BEGIN',
      'ACTION_IN_PROGRESS', 
      'ACTION_COMPLETE_AND_FINAL', 
      'ACTION_COMPLETE_STOP_GAP'
    ]),
    actionDescription: a.string(),
    uploadedAt: a.string().required(),
    uploadedBy: a.string().required(),
   }),

   RCA: a.customType({
    rcaId: a.string(),
    rcaDirectCauseWho: a.string(),
    rcaDirectCauseWhen: a.string(),
    rcaDirectCauseWhere: a.string(),
    rcaDirectCauseWhat: a.string(),
    rcaDirectCauseHow: a.string(),
    rcaDirectCauseGroup: a.string(),
    rcaDirectCauseSubGroup: a.string(),
    rcaIdentifyDirectCause: a.string(),
    rcaRootCauseWhy1: a.string(),
    rcaRootCauseWhy2: a.string(),
    rcaRootCauseWhy3: a.string(),
    rcaRootCauseWhy4: a.string(),
    rcaRootCauseWhy5: a.string(),
    isRCAComplete: a.string(),
    uploadedAt: a.string().required(),
    uploadedBy: a.string().required(),    
    rcaStatus: a.enum([
      'NOT_STARTED',
      'ACTION_IN_PROGRESS', 
      'ACTION_COMPLETE', 
    ]),
    rcaUploadedDocuments: a.ref('rcaDocuments').array(),
  }),


  rcaDocuments: a.customType({
    docId: a.string().required(),  
    fileName: a.string().required(),
    s3Key: a.string().required(),
    uploadedAt: a.string().required(),
    uploadedBy: a.string().required(),
    size: a.integer().required(),
    type: a.string().required()  
  }),


  FinalCorrectiveAction: a.customType({
    fcaId: a.string(),
    dueDate: a.string(),
    assignedTo: a.string(),
    fcaStatus: a.enum([
      'YET_TO_BEGIN',
      'ACTION_IN_PROGRESS', 
      'ACTION_COMPLETE', 
    ]),
    actionDescription: a.string(),
    actionNotes: a.string(),
    uploadedAt: a.string().required(),
    uploadedBy: a.string().required(),
   }),  
 

    
 
   llDocuments: a.customType({
    docId: a.string().required(),  
    fileName: a.string().required(),
    s3Key: a.string().required(),
    uploadedAt: a.string().required(),
    uploadedBy: a.string().required(),
    size: a.integer().required(),
    type: a.string().required()  
  }),
 

   LessonsLearned: a.customType({
    llid: a.string(),
    lessonsLearnedAuthor: a.string(),
    lessonsLearnedTitle: a.string(),
    lessonsLearnedSegment: a.string(),
    lessonsLearnedLocation: a.string(),
    lessonsLearnedKeyWords: a.string(),    
    lessonsLearnedDocuments: a.ref('llDocuments').array(),
    lessonsLearnedApprover: a.string(),
    lessonDescription: a.string(),
    keyTakeaways: a.string(),
     uploadedAt: a.string().required(),
    uploadedBy: a.string().required(),
    // ✅ Approval fields
    lessonsLearnedApprovalStatus: a.enum(['LL_NOT_SENT', 'LL_SENT_FOR_APPROVAL', 'LL_APPROVED','LL_SENT_BACK_FOR_REVISION']),
    lessonsLearnedSentforApprovalBy: a.string(), // user email/username
    lessonsLearnedSentforApprovalAt: a.string(), // ISO timestamp
    lessonsLearnedSenttoApprover: a.string(), // dropdown value    
  }),

  

  Submission: a.model({
    id: a.id(),
    submissionId: a.string().required(),
    recordType: a.string().required(),
    // time and date fields
    dateOfIncident: a.string(),
    timeOfIncident: a.string(),
    timeOfIncidentHour: a.string(),
    timeOfIncidentMinute: a.string(),
    timeOfInjuryAmPm: a.string(),
    timeEmployeeBegan: a.string(),
    timeEmployeeBeganAmPm: a.string(),
    // US-specific employee information
    employeeId: a.string(),
    firstName: a.string(),
    lastName: a.string(),
    streetAddress: a.string(),
    city: a.string(),
    state: a.string(),
    zipCode: a.string(),
    phoneNumber: a.string(),
    dateOfBirth: a.string(),
    sex: a.string(),
    dateHired: a.string(),
    priorActivity: a.string(),
    // location and division fields
    incidentLocation: a.string(),
    division: a.string(),
    platform: a.string(),
    // employee classification fields
    employeeType: a.string(),
    ageRange: a.string(),
    tenure: a.string(),
    experience: a.string(),
    title: a.string(),
    //  incident details
    locationOnSite: a.string(),
    whereDidThisOccur: a.string(),
    workAreaDescription: a.string(),
    workActivityCategory: a.string(),
    incidentDescription: a.string(),
    injuryDescription: a.string(),
    activityType: a.string(),
    injuryType: a.string().array(),
    injuredBodyPart: a.string().array(),
    incidentType: a.string(),
    //  status fields
    estimatedLostWorkDays: a.integer(),//calssification
    injuryCategory: a.string(),//calssification
    incidentCategory: a.string(),
    isCovidRelated: a.string(),
    isRestrictedWork: a.string(),
    isJobTransfer: a.string(),
    finalDaysAway: a.integer(),
    // metadata fields
    createdAt: a.string(),
    updatedAt: a.string(),
    createdBy: a.string(),
    updatedBy: a.string(),
    owner: a.string(),
    investigationStatus: a.string(), //use for final status
    status: a.string().required().default('Not Viewed'),
    location: a.string().required().default('TBD'),
    submissionType: a.string().required().default('Direct'),
    OSHArecordableType: a.string(), //calssification
    caseClassification: a.string(),//calssification
    injuryIllness: a.string(), //calssification
    rejectionReason: a.string(),
    rejectedAt: a.string(),
    rejectedBy: a.string(),
    rcaAddOption: a.string(),
    documents: a.ref('Document').array(),
    interimCorrectiveActions: a.ref('InterimCorrectiveAction').array(),
    rca: a.ref('RCA').array(),
    finalCorrectiveAction: a.ref('FinalCorrectiveAction').array(),
    lessonsLearned: a.ref('LessonsLearned').array(),
    lessonsLearnedFlag: a.boolean(),
    // injuryStatus
    eventApprovaldueDate: a.string(),
    eventApprovalassignedTo: a.string(),
    eventApprovalStatus: a.enum(['YET_TO_START', 'ACTION_IN_PROGRESS', 'ACTION_COMPLETE', 'SEND_BACK']),
    eventApprovalDescription: a.string(),
    eventApprovalNotes: a.string(),
    eventApprovaluploadedAt: a.string(),
    eventApprovaluploadedBy: a.string(),
    //smartsheet
    smartsheetautonum: a.string(),
    autoNumber: a.string(),
    smartsheetUniqueId: a.string(),
    // metadata: a.json()
    // safetyalert
    saNumber: a.string(),
    saLocation: a.string(),
    saWhereInPlant: a.string(),
    saAdditionalDetail: a.string(),
    saAuthor: a.string(),
    saInjuryFlag: a.boolean(),
    saPropertyDamageFlag: a.boolean(),
    saIncidentDescripotion: a.string(),
    saActionAndNextSteps: a.string(),
    saImageBefore: a.string(),
    saImageAfter: a.string(),
    saCreateDate: a.string(),
    saUpdateDate: a.string(),
    saStatus: a.enum(['NONE','SAFETY_ALERT_OPEN','SAFETY_ALERT_NOT_CREATED','SAFETY_ALERT_CREATED']),
    saPDF: a.string(),
    //Quick Fix
    quickFixWasthisIncidentIventigated: a.boolean(),
    quickFixDescribeCorrectiveActions: a.string(),
    quickFixDirectCauseGroup: a.string(),
    quickFixSubGroup: a.string(),
    quickFixRootCause: a.string(),
    quickFixUpdatedAt: a.string(),
    quickFixUpdatedBy: a.string(),
    quickFixDueDate: a.string(),
    quickFixAssignTo: a.string(),
    quickFixStatus: a.string(), //Assigned, Completed
    quickFixNotes: a.string(),

    //Observation
    obsTypeOfConcern: a.string(),
    obsPriorityType: a.string(), 
    obsCorrectiveAction: a.string(),

    hierarchyString: a.string(),
    
  }).authorization(allow => [
    allow.group('admin').to(['create', 'read', 'update', 'delete']),
    allow.group('hr').to(['create', 'read', 'update', 'delete']),
    allow.group('ENTERPRISE').to(['create', 'read', 'update']),
    allow.group('ENTERPRISE_SAFETY_DIRECTOR').to(['create', 'read', 'update']),
    allow.group('SEGMENT').to(['create', 'read', 'update']),
    allow.group('SEGMENT_SAFETY_DIRECTOR').to(['create', 'read', 'update']),
    allow.group('PLATFORM').to(['create', 'read', 'update']),  
    allow.group('REGIONAL').to(['create', 'read', 'update']),  
    allow.group('PLATFORM_GROUP_PRESIDENT').to(['create', 'read', 'update']),
    allow.group('PLATFORM_HR').to(['create', 'read', 'update']),
    allow.group('DIVISION_HR_DIRECTOR').to(['create', 'read', 'update']),
    allow.group('DIVISION_VP_GM_BUM').to(['create', 'read', 'update']),
    allow.group('DIVISION_OPS_DIRECTOR').to(['create', 'read', 'update']),
    allow.group('DIVISION_PLANT_MANAGER').to(['create', 'read', 'update']),
    allow.group('DIVISION_PLANT_HR').to(['create', 'read', 'update']),
    allow.group('DIVISION_SAFETY').to(['create', 'read', 'update']),
    allow.group('PLANT_SAFETY_MANAGER').to(['create', 'read', 'update']),
    allow.group('PLANT_SAFETY_CHAMPIONS').to(['create', 'read', 'update']),
    // ✅ Allow guest creation for public forms
    allow.guest().to(['create'])
  ]),
  ReferenceData: a.model({
    id: a.id(),
    category: a.string().required(), // e.g., 'employeeTypes', 'ageRanges', etc.
    value: a.string().required(), // The value stored in the database
    label: a.string().required(), // Display text shown in dropdowns
    isActive: a.boolean().required().default(true),
    order: a.integer(), // For controlling display order
    createdAt: a.datetime().required(),
    updatedAt: a.datetime(),
    createdBy: a.string().required(),
    updatedBy: a.string(),
    owner: a.string(),
    metadata: a.json()
  }).authorization(allow => [
    allow.group('admin').to(['create', 'read', 'update', 'delete']),
    allow.group('hr').to(['create', 'read', 'update', 'delete']),
    allow.group('ENTERPRISE').to(['read', 'update']),
    allow.group('ENTERPRISE_SAFETY_DIRECTOR').to(['read', 'update']),
    allow.group('SEGMENT').to(['read', 'update']),
    allow.group('SEGMENT_SAFETY_DIRECTOR').to(['read', 'update']),
    allow.group('PLATFORM').to(['read', 'update']), // ✅ Add this missing group
    allow.group('REGIONAL').to(['read', 'update']), // ✅ Add this missing group
    allow.group('PLATFORM_GROUP_PRESIDENT').to(['read', 'update']),
    allow.group('PLATFORM_HR').to(['read', 'update']),
    allow.group('DIVISION_HR_DIRECTOR').to(['read', 'update']),
    allow.group('DIVISION_VP_GM_BUM').to(['read', 'update']),
    allow.group('DIVISION_OPS_DIRECTOR').to(['read', 'update']),
    allow.group('DIVISION_PLANT_MANAGER').to(['read']),
    allow.group('DIVISION_PLANT_HR').to(['read']),
    allow.group('DIVISION_SAFETY').to(['read', 'update']),
    allow.group('PLANT_SAFETY_MANAGER').to(['read', 'update']),
    allow.group('PLANT_SAFETY_CHAMPIONS').to(['read']),
    allow.guest().to(['create'])
  ]),
  Level: a.model({
    id: a.id(),
    name: a.string().required(),
    type: a.enum(['ENTERPRISE', 'SEGMENT', 'REGIONAL', 'PLATFORM', 'DIVISION', 'PLANT']),
    parentLevelId: a.string(),
    code: a.string().required(),
    isActive: a.boolean().required().default(true),
    createdAt: a.datetime().required(),
    updatedAt: a.datetime(),
    createdBy: a.string().required(),
    updatedBy: a.string(),
    metadata: a.json()
  }).authorization(allow => [
    allow.group('admin').to(['create', 'read', 'update', 'delete']),
    allow.group('hr').to(['create', 'read', 'update', 'delete']),
    allow.group('ENTERPRISE').to(['read', 'update']),
    allow.group('ENTERPRISE_SAFETY_DIRECTOR').to(['read', 'update']),
    allow.group('SEGMENT').to(['read', 'update']),
    allow.group('SEGMENT_SAFETY_DIRECTOR').to(['read', 'update']),
    allow.group('PLATFORM').to(['read', 'update']), // ✅ Add this missing group
    allow.group('REGIONAL').to(['read', 'update']), // ✅ Add this missing group
    allow.group('PLATFORM_GROUP_PRESIDENT').to(['read', 'update']),
    allow.group('PLATFORM_HR').to(['read', 'update']),
    allow.group('DIVISION_HR_DIRECTOR').to(['read', 'update']),
    allow.group('DIVISION_VP_GM_BUM').to(['read', 'update']),
    allow.group('DIVISION_OPS_DIRECTOR').to(['read', 'update']),
    allow.group('DIVISION_PLANT_MANAGER').to(['read']),
    allow.group('DIVISION_PLANT_HR').to(['read']),
    allow.group('DIVISION_SAFETY').to(['read', 'update']),
    allow.group('PLANT_SAFETY_MANAGER').to(['read', 'update']),
    allow.group('PLANT_SAFETY_CHAMPIONS').to(['read']),
    allow.guest().to(['create'])
  ])
  ,
  Recognition: a.model({
    id: a.id(),
    recognitionId: a.string(),
    yourName: a.string(),
    yourEmployeeId: a.string(),
    recognizedPersonName: a.string(), 

    safetyFocused: a.boolean(),              // Check Box 1
    continualImprovement: a.boolean(),       // Check Box 2
    focus8020: a.boolean(),                  // Check Box 3
    entrepreneurialCulture: a.boolean(),     // Check Box 4
    attitudeFocused: a.boolean(),            // Check Box 5
    peopleFocused: a.boolean(),              // Check Box 6
    detailFocused: a.boolean(),              // Check Box 7
    employeeStory: a.string(),

    mediaUploadUrl: a.string(),   // Photo or Video Upload  
    thumbnailS3Key: a.string(), 
    photoSize: a.string(),        // Size in bytes
    photoType: a.string(),        // MIME type (e.g., "image/jpeg")
  

    contactRequested: a.boolean(),           // Yes/No
    contactPhoneNumber: a.string(), // Number Field

    //SmartSheet
    smartsheetautonum: a.string(),
    smartsheetUniqueId: a.string(),

    // System fields
    createdAt: a.datetime().required(),
    createdBy: a.string().required(),
    updatedAt: a.datetime(), 
    updatedBy: a.string(),
    metadata: a.json(),
    
    hierarchyString: a.string(),

  }).authorization(allow => [
    allow.group('admin').to(['create', 'read', 'update', 'delete']),
    allow.group('hr').to(['create', 'read', 'update', 'delete']),
    allow.group('ENTERPRISE').to(['create', 'read', 'update']),
    allow.group('ENTERPRISE_SAFETY_DIRECTOR').to(['create', 'read', 'update']),
    allow.group('SEGMENT').to(['create', 'read', 'update']),
    allow.group('SEGMENT_SAFETY_DIRECTOR').to(['create', 'read', 'update']),
    allow.group('PLATFORM').to(['create', 'read', 'update']),  
    allow.group('REGIONAL').to(['create', 'read', 'update']),  
    allow.group('PLATFORM_GROUP_PRESIDENT').to(['create', 'read', 'update']),
    allow.group('PLATFORM_HR').to(['create', 'read', 'update']),
    allow.group('DIVISION_HR_DIRECTOR').to(['create', 'read', 'update']),
    allow.group('DIVISION_VP_GM_BUM').to(['create', 'read', 'update']),
    allow.group('DIVISION_OPS_DIRECTOR').to(['create', 'read', 'update']),
    allow.group('DIVISION_PLANT_MANAGER').to(['create', 'read']),
    allow.group('DIVISION_PLANT_HR').to(['create', 'read']),
    allow.group('DIVISION_SAFETY').to(['create', 'read', 'update']),
    allow.group('PLANT_SAFETY_MANAGER').to(['create', 'read', 'update']),
    allow.group('PLANT_SAFETY_CHAMPIONS').to(['create', 'read']),
    allow.guest().to(['create']),
    allow.owner(),   // <- if using Cognito user
  ])
  ,
  Person: a.model({
    id: a.id(),
    email: a.string().required(),
    name: a.string().required(),
    firstName: a.string().required(),
    lastName: a.string().required(),
    levelId: a.string().array(),
    role: a.string().array(),
    isActive: a.boolean().required().default(true),
    accessLevel: a.enum(['ENTERPRISE', 'SEGMENT', 'REGIONAL', 'PLATFORM', 'DIVISION', 'PLANT']),
    plantAccess: a.string().array(), // Array of plant codes
    createdAt: a.datetime().required(),
    updatedAt: a.datetime(),
    createdBy: a.string().required(),
    updatedBy: a.string(),
    metadata: a.json()
  }).authorization(allow => [
    allow.group('admin').to(['create', 'read', 'update', 'delete']),
    allow.group('hr').to(['create', 'read', 'update', 'delete']),
    allow.group('ENTERPRISE').to(['read', 'update']),
    allow.group('ENTERPRISE_SAFETY_DIRECTOR').to(['read', 'update']),
    allow.group('SEGMENT').to(['read', 'update']),
    allow.group('SEGMENT_SAFETY_DIRECTOR').to(['read', 'update']),
    allow.group('PLATFORM').to(['read', 'update']), // ✅ Add this missing group
    allow.group('REGIONAL').to(['read', 'update']), // ✅ Add this missing group
    allow.group('PLATFORM_GROUP_PRESIDENT').to(['read', 'update']),
    allow.group('PLATFORM_HR').to(['read', 'update']),
    allow.group('DIVISION_HR_DIRECTOR').to(['read', 'update']),
    allow.group('DIVISION_VP_GM_BUM').to(['read', 'update']),
    allow.group('DIVISION_OPS_DIRECTOR').to(['read', 'update']),
    allow.group('DIVISION_PLANT_MANAGER').to(['read']),
    allow.group('DIVISION_PLANT_HR').to(['read']),
    allow.group('DIVISION_SAFETY').to(['read', 'update']),
    allow.group('PLANT_SAFETY_MANAGER').to(['read', 'update']),
    allow.group('PLANT_SAFETY_CHAMPIONS').to(['read']),
    allow.guest().to(['create'])
  ])
  ,
  Role: a.model({
    id: a.id(),
    name: a.string().required(),
    code: a.string().required(),
    levelType: a.enum(['ENTERPRISE', 'SEGMENT', 'REGIONAL', 'PLATFORM', 'DIVISION', 'PLANT']),
    permissions: a.string().array(),
    isActive: a.boolean().required().default(true),
    createdAt: a.datetime().required(),
    updatedAt: a.datetime(),
    createdBy: a.string().required(),
    updatedBy: a.string(),
    metadata: a.json()
  }).authorization(allow => [
    allow.group('admin').to(['create', 'read', 'update', 'delete']),
    allow.group('hr').to(['create', 'read', 'update', 'delete']),
    allow.group('ENTERPRISE').to(['read', 'update']),
    allow.group('ENTERPRISE_SAFETY_DIRECTOR').to(['read', 'update']),
    allow.group('SEGMENT').to(['read', 'update']),
    allow.group('SEGMENT_SAFETY_DIRECTOR').to(['read', 'update']),
    allow.group('PLATFORM').to(['read', 'update']), // ✅ Add this missing group
    allow.group('REGIONAL').to(['read', 'update']), // ✅ Add this missing group
    allow.group('PLATFORM_GROUP_PRESIDENT').to(['read', 'update']),
    allow.group('PLATFORM_HR').to(['read', 'update']),
    allow.group('DIVISION_HR_DIRECTOR').to(['read', 'update']),
    allow.group('DIVISION_VP_GM_BUM').to(['read', 'update']),
    allow.group('DIVISION_OPS_DIRECTOR').to(['read', 'update']),
    allow.group('DIVISION_PLANT_MANAGER').to(['read']),
    allow.group('DIVISION_PLANT_HR').to(['read']),
    allow.group('DIVISION_SAFETY').to(['read', 'update']),
    allow.group('PLANT_SAFETY_MANAGER').to(['read', 'update']),
    allow.group('PLANT_SAFETY_CHAMPIONS').to(['read']),
    allow.guest().to(['create'])
  ]),
  LevelHierarchy: a.model({
    id: a.id(),
    parentLevelId: a.string().required(),
    childLevelId: a.string().required(),
    isActive: a.boolean().required().default(true),
    createdAt: a.datetime().required(),
    updatedAt: a.datetime(),
    createdBy: a.string().required(),
    updatedBy: a.string(),
    metadata: a.json(),
    metatest: a.string(),
  }).authorization(allow => [
    allow.group('admin').to(['create', 'read', 'update', 'delete']),
    allow.group('hr').to(['create', 'read', 'update', 'delete']),
    allow.group('ENTERPRISE').to(['read', 'update']),
    allow.group('ENTERPRISE_SAFETY_DIRECTOR').to(['read', 'update']),
    allow.group('SEGMENT').to(['read', 'update']),
    allow.group('SEGMENT_SAFETY_DIRECTOR').to(['read', 'update']),
    allow.group('PLATFORM').to(['read', 'update']), // ✅ Add this missing group
    allow.group('REGIONAL').to(['read', 'update']), // ✅ Add this missing group
    allow.group('PLATFORM_GROUP_PRESIDENT').to(['read', 'update']),
    allow.group('PLATFORM_HR').to(['read', 'update']),
    allow.group('DIVISION_HR_DIRECTOR').to(['read', 'update']),
    allow.group('DIVISION_VP_GM_BUM').to(['read', 'update']),
    allow.group('DIVISION_OPS_DIRECTOR').to(['read', 'update']),
    allow.group('DIVISION_PLANT_MANAGER').to(['read']),
    allow.group('DIVISION_PLANT_HR').to(['read']),
    allow.group('DIVISION_SAFETY').to(['read', 'update']),
    allow.group('PLANT_SAFETY_MANAGER').to(['read', 'update']),
    allow.group('PLANT_SAFETY_CHAMPIONS').to(['read']),
    allow.guest().to(['create'])
  ]),
  SIMSLookupDataREF: a.customType({
    refId: a.string().required(),
    refFieldType: a.string().required(),
    refForm: a.string(),
    refValue: a.string().required(),
    refStatus: a.string().required(),
  }),
  SmartsheetInjury: a.model({
    id: a.id(),
    sheetId: a.string().required(),
    rowId: a.string().required(),
    autoNumber: a.string(),
    simsAutoRecordId: a.string(),
    resolved: a.boolean(),
    lessonsLearned: a.string(),
    emergency: a.string(),
    location: a.string(),
    employeeId: a.string(),
    firstName: a.string(),
    lastName: a.string(),
    streetAddress: a.string(),
    city: a.string(),
    state: a.string(),
    zipCode: a.string(),
    dateOfBirth: a.string(),
    dateHired: a.string(),
    employeeType: a.string(),
    dateOfIncident: a.string(),
    timeOfIncident: a.string(),
    incidentDescription: a.string(),
    injuryDescription: a.string(),
    bodyPartInjured: a.string(),
    injuryCategory: a.string(),
    incidentCategory: a.string(),
    submissionStatus: a.string(),
    investigationStatus: a.string(),
    isCovidRelated: a.string(),
    rawData: a.json(), // Store the complete row data
    lastSyncedAt: a.datetime().required(),
    createdAt: a.datetime().required(),
    updatedAt: a.datetime(),
  }).authorization(allow => [
    allow.group('admin').to(['create', 'read', 'update', 'delete']),
    allow.group('hr').to(['create', 'read', 'update', 'delete']),
    allow.group('ENTERPRISE').to(['read', 'update']),
    allow.group('ENTERPRISE_SAFETY_DIRECTOR').to(['read', 'update']),
    allow.group('SEGMENT').to(['read', 'update']),
    allow.group('SEGMENT_SAFETY_DIRECTOR').to(['read', 'update']),
    allow.group('PLATFORM').to(['read', 'update']), // ✅ Add this missing group
    allow.group('REGIONAL').to(['read', 'update']), // ✅ Add this missing group
    allow.group('PLATFORM_GROUP_PRESIDENT').to(['read', 'update']),
    allow.group('PLATFORM_HR').to(['read', 'update']),
    allow.group('DIVISION_HR_DIRECTOR').to(['read', 'update']),
    allow.group('DIVISION_VP_GM_BUM').to(['read', 'update']),
    allow.group('DIVISION_OPS_DIRECTOR').to(['read', 'update']),
    allow.group('DIVISION_PLANT_MANAGER').to(['read']),
    allow.group('DIVISION_PLANT_HR').to(['read']),
    allow.group('DIVISION_SAFETY').to(['read', 'update']),
    allow.group('PLANT_SAFETY_MANAGER').to(['read', 'update']),
    allow.group('PLANT_SAFETY_CHAMPIONS').to(['read']),
    allow.guest().to(['create'])
  ]),
  
  SmartsheetObservation: a.model({
    id: a.id(),
    sheetId: a.string().required(),
    rowId: a.string().required(),
    autoNumber: a.string(),
    simsAutoId: a.string(),
    location: a.string(),
    name: a.string(),
    employeeId: a.string(),
    dateOfIncident: a.string(),
    timeOfIncident: a.string(),
    amPm: a.string(),
    typeOfConcern: a.string(),
    priorityType: a.string(),
    generalIncidentLocation: a.string(), //Where did this Occur?
    whereDidThisOccur: a.string(), 
    workAreaDescription: a.string(),
    workActivityCategory: a.string(),
    problem: a.string(),
    correctiveAction: a.string(),
    quickFix: a.string(),
    managersComments: a.string(),
    phoneNumber: a.string(),
    modifiedDate: a.string(),
    division: a.string(),
    platform: a.string(),
    employeeType: a.string(),
    ageRange: a.string(),
    tenure: a.string(),
    experience: a.string(),
    title: a.string(),
    locationOnSite: a.string(),
    rawData: a.json(), // Store the complete row data
    lastSyncedAt: a.datetime().required(),
    createdAt: a.datetime().required(),
    updatedAt: a.datetime(),
  }).authorization(allow => [
    allow.group('admin').to(['create', 'read', 'update', 'delete']),
    allow.group('hr').to(['create', 'read', 'update', 'delete']),
    allow.group('ENTERPRISE').to(['read', 'update']),
    allow.group('ENTERPRISE_SAFETY_DIRECTOR').to(['read', 'update']),
    allow.group('SEGMENT').to(['read', 'update']),
    allow.group('SEGMENT_SAFETY_DIRECTOR').to(['read', 'update']),
    allow.group('PLATFORM').to(['read', 'update']), // ✅ Add this missing group
    allow.group('REGIONAL').to(['read', 'update']), // ✅ Add this missing group
    allow.group('PLATFORM_GROUP_PRESIDENT').to(['read', 'update']),
    allow.group('PLATFORM_HR').to(['read', 'update']),
    allow.group('DIVISION_HR_DIRECTOR').to(['read', 'update']),
    allow.group('DIVISION_VP_GM_BUM').to(['read', 'update']),
    allow.group('DIVISION_OPS_DIRECTOR').to(['read', 'update']),
    allow.group('DIVISION_PLANT_MANAGER').to(['read']),
    allow.group('DIVISION_PLANT_HR').to(['read']),
    allow.group('DIVISION_SAFETY').to(['read', 'update']),
    allow.group('PLANT_SAFETY_MANAGER').to(['read', 'update']),
    allow.group('PLANT_SAFETY_CHAMPIONS').to(['read']),
    allow.guest().to(['create'])
  ]),
  
  SmartsheetRecognition: a.model({
    id: a.id(),
    sheetId: a.string().required(),
    rowId: a.string().required(),
    autoNumber: a.string(),
    location: a.string(),
    nameOfRecipient: a.string(),
    checkbox: a.string(),
    supervisorName: a.string(),
    tellYourStory: a.string(),
    yourName: a.string(),
    employeeId: a.string(),
    phoneNumber: a.string(),
    rawData: a.json(), // Store the complete row data
    lastSyncedAt: a.datetime().required(),
    createdAt: a.datetime().required(),
    updatedAt: a.datetime(),
  }).authorization(allow => [
    allow.group('admin').to(['create', 'read', 'update', 'delete']),
    allow.group('hr').to(['create', 'read', 'update', 'delete']),
    allow.group('ENTERPRISE').to(['read', 'update']),
    allow.group('ENTERPRISE_SAFETY_DIRECTOR').to(['read', 'update']),
    allow.group('SEGMENT').to(['read', 'update']),
    allow.group('SEGMENT_SAFETY_DIRECTOR').to(['read', 'update']),
    allow.group('PLATFORM').to(['read', 'update']), // ✅ Add this missing group
    allow.group('REGIONAL').to(['read', 'update']), // ✅ Add this missing group
    allow.group('PLATFORM_GROUP_PRESIDENT').to(['read', 'update']),
    allow.group('PLATFORM_HR').to(['read', 'update']),
    allow.group('DIVISION_HR_DIRECTOR').to(['read', 'update']),
    allow.group('DIVISION_VP_GM_BUM').to(['read', 'update']),
    allow.group('DIVISION_OPS_DIRECTOR').to(['read', 'update']),
    allow.group('DIVISION_PLANT_MANAGER').to(['read']),
    allow.group('DIVISION_PLANT_HR').to(['read']),
    allow.group('DIVISION_SAFETY').to(['read', 'update']),
    allow.group('PLANT_SAFETY_MANAGER').to(['read', 'update']),
    allow.group('PLANT_SAFETY_CHAMPIONS').to(['read']),
    allow.guest().to(['create'])
  ]),
  UserRole: a.model({
    email: a.string().required(),
    name: a.string().required(),
    roleTitle: a.string().required(),
    enterprise: a.string(),
    segment: a.string(),
    platform: a.string(),
    division: a.string(),
    plant: a.string(),
    hierarchyString: a.string().required(),
    level: a.integer().required(),
    cognitoGroups: a.string().array(),
    region: a.string(),
    country: a.string(),
    state: a.string(),
    isActive: a.boolean().default(true),
    createdAt: a.string().required(),
    updatedAt: a.string(),
    createdBy: a.string().required(),
    updatedBy: a.string()
  }).identifier(['email'])
  .authorization(allow => [
    allow.group('admin').to(['create', 'read', 'update', 'delete']),
    allow.group('hr').to(['create', 'read', 'update', 'delete']),
    allow.group('ENTERPRISE').to(['read', 'update']),
    allow.group('ENTERPRISE_SAFETY_DIRECTOR').to(['read', 'update']),
    allow.group('SEGMENT').to(['read', 'update']),
    allow.group('SEGMENT_SAFETY_DIRECTOR').to(['read', 'update']),
    allow.group('PLATFORM').to(['read', 'update']), // ✅ Add this missing group
    allow.group('REGIONAL').to(['read', 'update']), // ✅ Add this missing group
    allow.group('PLATFORM_GROUP_PRESIDENT').to(['read', 'update']),
    allow.group('PLATFORM_HR').to(['read', 'update']),
    allow.group('DIVISION_HR_DIRECTOR').to(['read', 'update']),
    allow.group('DIVISION_VP_GM_BUM').to(['read', 'update']),
    allow.group('DIVISION_OPS_DIRECTOR').to(['read', 'update']),
    allow.group('DIVISION_PLANT_MANAGER').to(['read']),
    allow.group('DIVISION_PLANT_HR').to(['read']),
    allow.group('DIVISION_SAFETY').to(['read', 'update']),
    allow.group('PLANT_SAFETY_MANAGER').to(['read', 'update']),
    allow.group('PLANT_SAFETY_CHAMPIONS').to(['read']),
    allow.guest().to(['create'])
  ]),
  
  RolePermission: a.model({
    roleTitle: a.string().required(),
    canReportInjury: a.boolean().default(false),
    canReportObservation: a.boolean().default(false),
    canSafetyRecognition: a.boolean().default(false),
    canTakeFirstReportActions: a.boolean().default(false),
    canViewPII: a.boolean().default(false),
    canTakeQuickFixActions: a.boolean().default(false),
    canTakeIncidentRCAActions: a.boolean().default(false),
    canPerformApprovalIncidentClosure: a.boolean().default(false),
    canViewManageOSHALogs: a.boolean().default(false),
    canViewOpenClosedReports: a.boolean().default(false),
    canViewSafetyAlerts: a.boolean().default(false),
    canViewLessonsLearned: a.boolean().default(false),
    canViewDashboard: a.boolean().default(false),
    canSubmitDSATicket: a.boolean().default(false),
    canApproveLessonsLearned: a.boolean().default(false),
    createdAt: a.string().required(),
    updatedAt: a.string(),
    createdBy: a.string().required(),
    updatedBy: a.string()
  }).identifier(['roleTitle'])
  .authorization(allow => [
    allow.group('admin').to(['create', 'read', 'update', 'delete']),
    allow.group('hr').to(['create', 'read', 'update', 'delete']),
    allow.group('ENTERPRISE').to(['read', 'update']),
    allow.group('ENTERPRISE_SAFETY_DIRECTOR').to(['read', 'update']),
    allow.group('SEGMENT').to(['read', 'update']),
    allow.group('SEGMENT_SAFETY_DIRECTOR').to(['read', 'update']),
    allow.group('PLATFORM').to(['read', 'update']), // ✅ Add this missing group
    allow.group('REGIONAL').to(['read', 'update']), // ✅ Add this missing group
    allow.group('PLATFORM_GROUP_PRESIDENT').to(['read', 'update']),
    allow.group('PLATFORM_HR').to(['read', 'update']),
    allow.group('DIVISION_HR_DIRECTOR').to(['read', 'update']),
    allow.group('DIVISION_VP_GM_BUM').to(['read', 'update']),
    allow.group('DIVISION_OPS_DIRECTOR').to(['read', 'update']),
    allow.group('DIVISION_PLANT_MANAGER').to(['read']),
    allow.group('DIVISION_PLANT_HR').to(['read']),
    allow.group('DIVISION_SAFETY').to(['read', 'update']),
    allow.group('PLANT_SAFETY_MANAGER').to(['read', 'update']),
    allow.group('PLANT_SAFETY_CHAMPIONS').to(['read']),
    allow.guest().to(['create'])
  ]),
  EnterpriseToPlantHierarchy: a.model({
    id: a.id(),
    hierarchyString: a.string().required(), // Full hierarchy path
    level: a.integer().required(), // 1-5 (Enterprise to Plant)
    levelName: a.string().required(), // "Enterprise", "Segment", "Platform", "Division", "Plant"
    name: a.string().required(), // Individual name (e.g., "Genay", "TFM EU", "Automotive OEM")
    parentHierarchyString: a.string(), // Parent hierarchy path
    enterprise: a.string(), // "ITW"
    segment: a.string(), // "Automotive OEM"
    platform: a.string(), // "TFM & Metals", "Smart Components", etc.
    division: a.string(), // "TFM EU", "Smart Components NA", etc.
    plant: a.string(), // "Genay", "Istebna", etc.
    region: a.string(),
    country: a.string(),
    state: a.string(),
    isActive: a.boolean().default(true),
    sortOrder: a.integer(), // For ordering within same level
    createdAt: a.datetime(),
    updatedAt: a.datetime(),
    createdBy: a.string().default("system"),
    updatedBy: a.string().default("system")
  })
  .authorization(allow => [
    // ✅ FIXED: Use exact same authorization pattern as your existing tables
    allow.group('admin').to(['create', 'read', 'update', 'delete']),
    allow.group('hr').to(['create', 'read', 'update', 'delete']),
    allow.group('ENTERPRISE').to(['create', 'read', 'update']),
    allow.group('ENTERPRISE_SAFETY_DIRECTOR').to(['create', 'read', 'update']),
    allow.group('SEGMENT').to(['create', 'read', 'update']),
    allow.group('SEGMENT_SAFETY_DIRECTOR').to(['create', 'read', 'update']),
    allow.group('PLATFORM').to(['create', 'read', 'update']),  
    allow.group('REGIONAL').to(['create', 'read', 'update']),  
    allow.group('PLATFORM_GROUP_PRESIDENT').to(['create', 'read', 'update']),
    allow.group('PLATFORM_HR').to(['create', 'read', 'update']),
    allow.group('DIVISION_HR_DIRECTOR').to(['create', 'read', 'update']),
    allow.group('DIVISION_VP_GM_BUM').to(['create', 'read', 'update']),
    allow.group('DIVISION_OPS_DIRECTOR').to(['create', 'read', 'update']),
    allow.group('DIVISION_PLANT_MANAGER').to(['create', 'read', 'update']),
    allow.group('DIVISION_PLANT_HR').to(['create', 'read', 'update']),
    allow.group('DIVISION_SAFETY').to(['create', 'read', 'update']),
    allow.group('PLANT_SAFETY_MANAGER').to(['create', 'read', 'update']),
    allow.group('PLANT_SAFETY_CHAMPIONS').to(['create', 'read', 'update']),
    // ✅ Allow guest creation for public forms (matching your pattern)
    allow.guest().to(['create'])
  ])
  .secondaryIndexes(index => [
    index('hierarchyString'),
    index('level'),
    index('parentHierarchyString'),
    index('enterprise'),
    index('segment'),
    index('platform'),
    index('division'),
    index('plant')
  ]),
  Level5Geography: a.model({
    id: a.id(),
    segment: a.string().required(),
    platform: a.string().required(), 
    division: a.string().required(),
    plant: a.string().required(),
    region: a.string().required(),
    country: a.string().required(),
    state: a.string(), // Optional since some countries don't have states
    hierarchyString: a.string().required(), // Full hierarchy path for filtering
    isActive: a.boolean().default(true),
    createdAt: a.datetime().required(),
    updatedAt: a.datetime(),
    createdBy: a.string().required(),
    updatedBy: a.string()
  }).authorization(allow => [
    allow.group('admin').to(['create', 'read', 'update', 'delete']),
    allow.group('hr').to(['create', 'read', 'update', 'delete']),
    allow.group('ENTERPRISE').to(['create', 'read', 'update']),
    allow.group('ENTERPRISE_SAFETY_DIRECTOR').to(['create', 'read', 'update']),
    allow.group('SEGMENT').to(['create', 'read', 'update']),
    allow.group('SEGMENT_SAFETY_DIRECTOR').to(['create', 'read', 'update']),
    allow.group('PLATFORM').to(['create', 'read', 'update']),  
    allow.group('REGIONAL').to(['create', 'read', 'update']),  
    allow.group('PLATFORM_GROUP_PRESIDENT').to(['create', 'read', 'update']),
    allow.group('PLATFORM_HR').to(['create', 'read', 'update']),
    allow.group('DIVISION_HR_DIRECTOR').to(['create', 'read', 'update']),
    allow.group('DIVISION_VP_GM_BUM').to(['create', 'read', 'update']),
    allow.group('DIVISION_OPS_DIRECTOR').to(['create', 'read', 'update']),
    allow.group('DIVISION_PLANT_MANAGER').to(['create', 'read', 'update']),
    allow.group('DIVISION_PLANT_HR').to(['create', 'read', 'update']),
    allow.group('DIVISION_SAFETY').to(['create', 'read', 'update']),
    allow.group('PLANT_SAFETY_MANAGER').to(['create', 'read', 'update']),
    allow.group('PLANT_SAFETY_CHAMPIONS').to(['create', 'read', 'update']),
    allow.guest().to(['create'])
  ])
  .secondaryIndexes(index => [
    index('segment'),
    index('platform'),
    index('division'),
    index('plant'),
    index('region'),
    index('country'),
    index('hierarchyString')
  ]),
  
 
/*
  lookupDataByType: a.query() 
    .arguments({
      refFieldType: a.string().required(),
    })
    .returns([a.ref('SIMSLookupDataREF')])
    .authorization((allow) => allow.authenticated())
    .handler(
      a.handler.custom({
        dataSource: "SIMSLookupDataSource",
        entry: "./functions/listLookupDataByType.ts",
      })
    ),*/

});

export type Schema = ClientSchema<typeof schema>;
export { schema };
 