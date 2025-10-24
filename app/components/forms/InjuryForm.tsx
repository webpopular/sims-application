//app/components/forms/InjuryForm.tsx --WORKING OLD CODE, expect           const userAccess = await getUserDataAccess(userInfo.email);

'use client';
import {useEffect, useState} from "react";
import {useRouter, useSearchParams} from 'next/navigation';
import type {Document} from "@/app/types";
import {
    EventApprovalEnum,
    type InjuryFormData,
    type InjuryFormProps,
    ReferenceDataItem,
    SubmissionResult,
} from '@/app/types';
import {fetchAuthSession, getCurrentUser} from 'aws-amplify/auth';
import RejectModal from '../modals/RejectModal';
import SaveSuccessModal from '../modals/SaveSuccessModal';
import ClassificationModal from '../modals/ClassificationModal';
import {toast} from 'react-hot-toast';
import {getUserInfo} from '@/lib/utils/getUserInfo';
import {useLookupData} from "@/app/utils/useLookupData";
import DocumentsModal from '../modals/DocumentUploadModal';
import {useUserAccess} from '@/app/hooks/useUserAccess';
import {sendInjuryToSmartsheet} from "@/app/components/smartsheet/smartsheet-service";
import { type Schema } from '@/amplify/data/schema';
import { initAmplify } from '@/app/amplify-init';
import { generateClient } from "aws-amplify/data";
import {callAppSync} from "@/lib/utils/appSync";

initAmplify();

let dataClient: any = null;
async function getDataClient() {
    if (!dataClient) {
        const mod = await import('aws-amplify/data');
        dataClient = mod.generateClient<any>();
    }
    return dataClient;
}




// Helper function to generate report ID with format I-YYMMDD-HHMMSS
const generateReportId = (formType: 'US' | 'Global') => {
    const now = new Date();
    const prefix = formType === 'US' ? 'US-I-' : 'GL-I-';
    return prefix +
        now.getFullYear().toString().slice(-2) +
        String(now.getMonth() + 1).padStart(2, '0') +
        String(now.getDate()).padStart(2, '0') +
        '-' +
        String(now.getHours()).padStart(2, '0') +
        String(now.getMinutes()).padStart(2, '0') +
        String(now.getSeconds()).padStart(2, '0');
};




const defaultFormState: InjuryFormData = {
    submissionId: '',
    recordType: '',
    dateOfIncident: '',
    timeOfIncident: '',
    timeOfIncidentHour: '',
    timeOfIncidentMinute: '',
    timeOfInjuryAmPm: 'AM',
    timeEmployeeBegan: '',
    timeEmployeeBeganAmPm: 'AM',
    incidentLocation: '',
    division: '',
    platform: '',
    employeeType: '',
    ageRange: '',
    tenure: '',
    experience: '',
    title: '',
    locationOnSite: '',
    whereDidThisOccur: '',
    workAreaDescription: '',
    workActivityCategory: '',
    incidentDescription: '',
    injuryDescription: '',
    activityType: '',
    injuryType: [],
    injuredBodyPart: [],
    incidentType: '',
    estimatedLostWorkDays: undefined,
    injuryCategory: undefined,
    incidentCategory: undefined,
    isCovidRelated: 'No',
    isRestrictedWork: 'No',
    isJobTransfer: 'No',
    finalDaysAway: 0,
    createdAt: '',
    updatedAt: '',
    status: 'Draft',
    investigationStatus: '',
    location: 'TBD',
    submissionType: 'Direct',
    OSHArecordableType: '',
    caseClassification: '',
    injuryIllness: '',

    // US-Specific Fields
    employeeId: '',
    firstName: '',
    lastName: '',
    streetAddress: '',
    city: '',
    state: '',
    zipCode: '',
    phoneNumber: '',
    dateOfBirth: '',
    sex: '',
    dateHired: '',

    // Additional Fields
    documents: [],
    interimCorrectiveActions: [],
    rca: [],
    finalCorrectiveAction: [],

    eventApprovaldueDate: '',
    eventApprovalassignedTo: '',
    eventApprovalStatus: EventApprovalEnum.NotStarted,
    eventApprovalDescription: '',
    eventApprovalNotes: '',
    eventApprovaluploadedAt: '',
    eventApprovaluploadedBy: '',

    //safetyalert
    saNumber: '',
    saLocation: '',
    saWhereInPlant: '',
    saAdditionalDetail: '',
    saAuthor: '',
    saInjuryFlag: false,
    saPropertyDamageFlag: false,
    saIncidentDescripotion: '',
    saActionAndNextSteps: '',
    saImageBefore: '',
    saImageAfter: '',
    saCreateDate: '',
    saUpdateDate: '',
    saStatus: 'NONE',
    //quick Fix
    quickFixWasthisIncidentIventigated: false,
    quickFixDescribeCorrectiveActions: '',
    quickFixDirectCauseGroup: '',
    quickFixSubGroup: '',
    quickFixRootCause: '',
    quickFixUpdatedAt: '',
    quickFixUpdatedBy: '',

}

// Get user info using the same function as for groups
//const userInfo = await getUserInfo();
//const uploadedBy = userInfo.email || userInfo.username || 'Unknown';
//const createdBy = userInfo.email || userInfo.username || 'Unknown';


export default function InjuryForm({ mode, formType, initialData, title }: InjuryFormProps) {

    const { userAccess, hasPermission, canPerformAction, isReady } = useUserAccess();
    const [formData, setFormData] = useState<InjuryFormData>(defaultFormState);
    const [isLoading, setIsLoading] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [showRejectSuccessModal, setShowRejectSuccessModal] = useState(false);
    const [submission, setSubmission] = useState<SubmissionResult>({ success: false });
    const [hasFormChanges, setHasFormChanges] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showClassificationModal, setShowClassificationModal] = useState(false);
    const [showDocsModal, setShowDocsModal] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [createdBy, setCreatedBy] = useState<string>('Unknown');

    // ✅ FIXED: Use correct function names from useUserAccess hook
    const canTakeFirstReportActions = hasPermission('canTakeFirstReportActions');
    const canPerformApprovalIncidentClosure = hasPermission('canPerformApprovalIncidentClosure');
    const canReportInjury = hasPermission('canReportInjury');
    const canViewPII = hasPermission('canViewPII');

    const isSubmitter = (formData as any).createdBy === createdBy || createdBy === 'Unknown';




    const { getOptions, lookupValues } = useLookupData();



    const [referenceData, setReferenceData] = useState<{
        recordTypes: ReferenceDataItem[];
        employeeTypes: ReferenceDataItem[];
        ageRanges: ReferenceDataItem[];
        tenureRanges: ReferenceDataItem[];
        experienceLevels: ReferenceDataItem[];
        locationTypes: ReferenceDataItem[];
        activityTypes: ReferenceDataItem[];
        injuryTypes: ReferenceDataItem[];
        injuredBodyParts: ReferenceDataItem[];
        incidentTypes: ReferenceDataItem[];
        whereDidThisOccur: ReferenceDataItem[];
    }>({
        recordTypes: [],
        employeeTypes: [],
        ageRanges: [],
        tenureRanges: [],
        experienceLevels: [],
        locationTypes: [],
        activityTypes: [],
        injuryTypes: [],
        injuredBodyParts: [],
        incidentTypes: [],
        whereDidThisOccur: [],
    });









    const searchParams = useSearchParams();
    const router = useRouter();
    const currentMode = searchParams.get('mode') as InjuryFormProps['mode'] || mode;

    const urlMode = searchParams.get("mode") || mode; // ✅ Fetch mode from URL first
    const isReadOnly = urlMode === "readonly";

    console.log('Current mode:::::', currentMode);
    console.log('Current formType:::::', formType);
    console.log('title', title);
    console.log('Component rendering. Current props:', { mode, formType, id: initialData?.id, title });
    console.log('submissionId:', { submissionId: initialData?.submissionId });
    console.log('id:', { id: initialData?.id });

    // ✅ SINGLE useEffect to replace both - combines RBAC with fallback to old getUserInfo
    useEffect(() => {
        const initializeUser = async () => {
            try {
                // ✅ First priority: Use RBAC data if available
                if (isReady && userAccess) {
                    console.log('🔍 [RBAC] Submitting as user:', userAccess.email, 'Cognito Groups:', userAccess.cognitoGroups);
                    console.log('🔍 [RBAC] User role:', userAccess.roleTitle, 'Level:', userAccess.level);
                    console.log('🔍 [RBAC] Hierarchy:', userAccess.hierarchyString);
                    setCreatedBy(userAccess.email || 'Unknown');
                    return; // Exit early if RBAC data is available
                }

                // ✅ Fallback: Use old getUserInfo method if RBAC not ready
                console.log('🔍 [FALLBACK] RBAC not ready, using getUserInfo...');
                const userInfo = await getUserInfo();
                console.log('🔍 [FALLBACK] Submitting as user:', userInfo.email, 'Groups:', userInfo.groups);
                setCreatedBy(userInfo.email || userInfo.username || 'Unknown');

            } catch (error) {
                console.error('❌ Failed to get user info:', error);
                setCreatedBy('Unknown');
            }
        };

        // ✅ Only run when RBAC state changes or on mount
        initializeUser();
    }, [isReady, userAccess?.email]); // ✅ Dependencies: run when RBAC becomes ready or user changes


    async function getIdentityId() {
        const session = await fetchAuthSession();
        return session.identityId;
    }


    useEffect(() => {
        if (initialData) {
            console.log("🔄 Initial data detected, updating form:", initialData);
            console.log("Current mode:", mode);
            setFormData((prev) => ({
                ...defaultFormState,
                ...prev,
                ...initialData,
                submissionId: initialData.submissionId || prev.submissionId,
            }));
        }
    }, [initialData, mode]);


    useEffect(() => {
        console.log("[DEBUG] Work Activity Type values:", lookupValues["Work Activity Type"]);

        if (Object.keys(lookupValues).length === 0) return;

        setReferenceData({
            recordTypes: [],
            employeeTypes: lookupValues["Employee Type"] || [],
            ageRanges: lookupValues["Age Range"] || [],
            tenureRanges: lookupValues["Experience at ITW"] || [],
            experienceLevels: lookupValues["Experience in Role"] || [],
            locationTypes: lookupValues["Plant Location"] || lookupValues["Location"] || [],
            activityTypes: lookupValues["Work Activity Type"] || [],
            injuryTypes: lookupValues["Injury Type"] || [],
            injuredBodyParts: lookupValues["Injured Body Part"] || [],
            incidentTypes: lookupValues["Incident Type"] || [],
            whereDidThisOccur: lookupValues["Where Did This Occur"] || []

        });
    }, [lookupValues]); // ✅ Only runs when actual data is loaded


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        console.log('🔍 [DEBUG] Current user Cognito groups:', userAccess?.cognitoGroups);
        console.log('🔍 [DEBUG] User email:', userAccess?.email);
        console.log('🔍 [DEBUG] User role:', userAccess?.roleTitle);

        const session = await fetchAuthSession();
        const actualCognitoGroups = session.tokens?.accessToken?.payload?.['cognito:groups'] || [];
        console.log('🔍 [DEBUG] Actual Cognito groups from session:', actualCognitoGroups);

        try {
            const user = await getCurrentUser();
            const identityId = await getIdentityId();
            const newSubmissionId = generateReportId(formType);

            if (!userAccess) {
                throw new Error('User access data not available. Please refresh the page.');
            }

            console.log('[InjuryForm] Creating submission with hierarchy:', userAccess.hierarchyString);
            console.log('[InjuryForm] User permissions:', userAccess.permissions);
            console.log('[InjuryForm] Creating new submission with ID:', newSubmissionId);

            const submissionData = {
                submissionId: newSubmissionId,
                recordType: 'INJURY_REPORT',
                hierarchyString: userAccess.hierarchyString,
                division: formData.division,
                platform: formData.platform,
                status: 'Draft',
                investigationStatus: 'Draft',
                location: formData.location || 'TBD',
                submissionType: 'Direct',
                dateOfIncident: formData.dateOfIncident,
                timeOfIncidentHour: formData.timeOfIncidentHour || '00',
                timeOfIncidentMinute: formData.timeOfIncidentMinute || '00',
                timeOfInjuryAmPm: formData.timeOfInjuryAmPm,
                timeEmployeeBegan: formData.timeEmployeeBegan,
                timeEmployeeBeganAmPm: formData.timeEmployeeBeganAmPm,
                employeeId: formData.employeeId,
                firstName: formData.firstName,
                lastName: formData.lastName,
                streetAddress: formData.streetAddress,
                city: formData.city,
                state: formData.state,
                zipCode: formData.zipCode,
                phoneNumber: formData.phoneNumber,
                dateOfBirth: formData.dateOfBirth,
                sex: formData.sex,
                dateHired: formData.dateHired,
                employeeType: formData.employeeType,
                ageRange: formData.ageRange,
                isCovidRelated: formData.isCovidRelated,
                tenure: formData.tenure,
                experience: formData.experience,
                title: formData.title,
                locationOnSite: formData.locationOnSite,
                whereDidThisOccur: formData.whereDidThisOccur,
                workAreaDescription: formData.workAreaDescription,
                workActivityCategory: formData.workActivityCategory,
                incidentDescription: formData.incidentDescription,
                injuryDescription: formData.injuryDescription,
                activityType: formData.activityType,
                injuryType: formData.injuryType,
                injuredBodyPart: formData.injuredBodyPart,
                incidentType: formData.incidentType,
                createdBy: createdBy,
                owner: userAccess?.email || createdBy,
                createdAt: new Date().toISOString(),
                eventApprovaldueDate: formData.eventApprovaldueDate,
                eventApprovalassignedTo: formData.eventApprovalassignedTo,
                eventApprovalStatus: EventApprovalEnum.NotStarted,
                eventApprovalDescription: formData.eventApprovalDescription,
                eventApprovalNotes: formData.eventApprovalNotes,
                eventApprovaluploadedAt: formData.eventApprovaluploadedAt,
                eventApprovaluploadedBy: formData.eventApprovaluploadedBy,
                documents: [],
            };

            console.log('📦 Payload being submitted:', JSON.stringify(submissionData, null, 2));

            const client = await getDataClient();
            const mutation = `
              mutation CreateSubmission($input: CreateSubmissionInput!) {
                createSubmission(input: $input) {
                  id
                  submissionId
                  title
                }
              }
            `;
            const response = await callAppSync(mutation, { input: submissionData });
            console.log('🟢 Raw response from create:', response);

            if (!response?.data) {
                console.error('❌ No data returned from submission create. Full response:', response);
                throw new Error('Submission failed: No data returned.');
            }

            console.log('✅ Submission created successfully:', response.data);

            setFormData((prev) => ({
                ...prev,
                id: response.data?.id ?? prev.id,
                submissionId: newSubmissionId,
                status: 'Draft',
                documents: [],
            }));
            try {
                // ✅ Push to Smartsheet after successful submission
                await sendInjuryToSmartsheet(formData.location, submissionData);
                console.log('🟢 Successfully synced to Smartsheet.');
            } catch (err) {
                console.error('⚠️ Smartsheet sync failed:', err);
            }
            setHasFormChanges(false);
            setShowSuccessModal(true);
            setShowDocsModal(true);

            console.log('[InjuryForm] Submission successful. Redirecting...');
        } catch (error) {
            console.error('❌ Submission error:', error);

            if (error instanceof Error) {
                if (
                    error.message.includes('UnauthorizedException') ||
                    error.message.includes('Access Denied')
                ) {
                    setError('You do not have permission to create submissions. Please contact your administrator.');
                } else if (error.message.includes('Invalid login token')) {
                    setError('Your session has expired. Please log in again.');
                    window.location.href = '/login';
                } else {
                    setError(`Submission failed: ${error.message}`);
                }
            } else {
                setError('An unexpected error occurred. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };



    const handleSubmitxxx = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        console.log('🔍 [DEBUG] Current user Cognito groups:', userAccess?.cognitoGroups);
        console.log('🔍 [DEBUG] User email:', userAccess?.email);
        console.log('🔍 [DEBUG] User role:', userAccess?.roleTitle);

        // Check what the actual auth session shows
        const session = await fetchAuthSession();
        const actualCognitoGroups = session.tokens?.accessToken?.payload?.['cognito:groups'] || [];
        console.log('🔍 [DEBUG] Actual Cognito groups from session:', actualCognitoGroups);

        try {
            const user = await getCurrentUser();
            const identityId = await getIdentityId();
            const newSubmissionId = generateReportId(formType);

            //const userInfo = await getUserInfo();
            //const userAccess = await getUserDataAccess(userInfo.email);

            if (!userAccess) {
                throw new Error('User access data not available. Please refresh the page.');
            }

            console.log('[InjuryForm] Creating submission with hierarchy:', userAccess.hierarchyString);
            console.log('[InjuryForm] User permissions:', userAccess.permissions);
            console.log('[InjuryForm] Creating new submission with ID:', newSubmissionId);


            // 1. Create the submission record first (with empty docs)
            const submissionData = {
                submissionId: newSubmissionId,
                recordType: 'INJURY_REPORT',
                hierarchyString: userAccess.hierarchyString,
                division: formData.division,
                platform: formData.platform,
                status: 'Draft',
                investigationStatus: 'Draft',
                location: formData.location || 'TBD',
                submissionType: 'Direct',
                dateOfIncident: formData.dateOfIncident,
                timeOfIncidentHour: formData.timeOfIncidentHour || '00',
                timeOfIncidentMinute: formData.timeOfIncidentMinute || '00',
                timeOfInjuryAmPm: formData.timeOfInjuryAmPm,
                timeEmployeeBegan: formData.timeEmployeeBegan,
                timeEmployeeBeganAmPm: formData.timeEmployeeBeganAmPm,
                employeeId: formData.employeeId,
                firstName: formData.firstName,
                lastName: formData.lastName,
                streetAddress: formData.streetAddress,
                city: formData.city,
                state: formData.state,
                zipCode: formData.zipCode,
                phoneNumber: formData.phoneNumber,
                dateOfBirth: formData.dateOfBirth,
                sex: formData.sex,
                dateHired: formData.dateHired,
                employeeType: formData.employeeType,
                ageRange: formData.ageRange,
                isCovidRelated: formData.isCovidRelated,
                tenure: formData.tenure,
                experience: formData.experience,
                title: formData.title,
                locationOnSite: formData.locationOnSite,
                whereDidThisOccur: formData.whereDidThisOccur,
                workAreaDescription: formData.workAreaDescription,
                workActivityCategory: formData.workActivityCategory,
                incidentDescription: formData.incidentDescription,
                injuryDescription: formData.injuryDescription,
                activityType: formData.activityType,
                injuryType: formData.injuryType,
                injuredBodyPart: formData.injuredBodyPart,
                incidentType: formData.incidentType,
                createdBy: createdBy,
                //owner: user.username,
                owner: userAccess?.email || createdBy,
                createdAt: new Date().toISOString(),
                eventApprovaldueDate: formData.eventApprovaldueDate,
                eventApprovalassignedTo: formData.eventApprovalassignedTo,
                eventApprovalStatus: EventApprovalEnum.NotStarted,
                eventApprovalDescription: formData.eventApprovalDescription,
                eventApprovalNotes: formData.eventApprovalNotes,
                eventApprovaluploadedAt: formData.eventApprovaluploadedAt,
                eventApprovaluploadedBy: formData.eventApprovaluploadedBy,
                documents: [],
            };


            const mutation = `
              mutation CreateSubmission($input: CreateSubmissionInput!) {
                createSubmission(input: $input) {
                  id
                  submissionId
                  title
                }
              }
            `;
            const response = await callAppSync(mutation, { input: formData });

            try {
                if (!response.data) throw new Error('Submission failed: No data returned.');
                console.log('✅ Submission created successfully:', response.data);
            } catch (err) {
                console.error('❌ Submission create error:', err);
                throw err; // re-throw or handle as needed
            }




            setFormData((prev) => ({
                ...prev,
                id: response.data?.id ?? prev.id, // set id from response, fallback to previous if undefined
                submissionId: newSubmissionId,
                status: 'Draft',
                documents: [],
            }));

            setHasFormChanges(false);
            setShowSuccessModal(true);
            setShowDocsModal(true); //  Open the document upload modal 

            console.log('[InjuryForm] Submission successful. Redirecting...');

        } catch (error) {
            console.error('❌ Submission error:', error);

            if (error instanceof Error) {
                if (error.message.includes('UnauthorizedException') ||
                    error.message.includes('Access Denied')) {
                    setError('You do not have permission to create submissions. Please contact your administrator.');
                } else if (error.message.includes('Invalid login token')) {
                    setError('Your session has expired. Please log in again.');
                    // Redirect to login
                    window.location.href = '/login';
                } else {
                    setError(`Submission failed: ${error.message}`);
                }
            } else {
                setError('An unexpected error occurred. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };


    // ✅ Function to handle navigation after closing modal
    const handleCloseModal = () => {
        setShowSuccessModal(false);
        //router.push('/first-reports/injury'); // ✅ Now it only navigates when user clicks "OK"
        router.push('/'); // ✅ Now it only navigates when user clicks "OK"
    };

    const handleDocumentsSave = async (sectionName: string, docs: Document[]) => {
        try {
            setFormData(prev => ({ ...prev, documents: docs }));

            const updateInput: any = { documents: docs };
            if (formData.id) {
                updateInput.id = formData.id;
            } else {
                toast.error("No submission ID found. Cannot update documents.");
                return;
            }

            console.log('[handleDocumentsSave] updateInput:', updateInput);
            const client = await getDataClient();
            const response = await client.models.Submission.update(
                updateInput,
                { authMode: 'userPool' });

            if (response.data) {
                toast.success('Documents updated successfully!');
                console.log('[handleDocumentsSave] Documents updated in DB:', response.data);
            } else {
                toast.error('No data returned from update.');
                console.error('[handleDocumentsSave] No data returned from update.');
            }
        } catch (error) {
            toast.error('Failed to update documents.');
            console.error('[handleDocumentsSave] Failed to update documents in DB:', error);
        }
    };



    // ✅ Enhanced saveChangesAndContinue with permission checks
    const saveChangesAndContinue = async (callback: () => void) => {
        // ✅ Check permissions before allowing action
        if (callback === (() => setShowClassificationModal(true)) && !canTakeFirstReportActions) {
            toast.error('You do not have permission to take first report actions.');
            return;
        }

        if (callback === (() => setShowRejectModal(true)) && !canTakeFirstReportActions) {
            toast.error('You do not have permission to reject submissions.');
            return;
        }

        try {
            setIsLoading(true);
            await handleSaveChanges();
            callback();
        } catch (error) {
            console.error('[InjuryForm] Error saving changes before continuing:', error);
        } finally {
            setIsLoading(false);
        }
    };



    const handleReject = async (reason: string) => {
        try {
            const user = await getCurrentUser();
            console.log('Attempting to reject submission:', {
                id: initialData?.id,
                submissionId: formData.submissionId,
                reason: reason
            });

            // Only update the rejection-specific fields
            const client = await getDataClient();
            const response = await client.models.Submission.update({
                id: initialData?.id,
                submissionId: formData.submissionId,
                status: 'Rejected',
                rejectionReason: reason,
                rejectedAt: new Date().toISOString(),
                rejectedBy: createdBy
            },
                { authMode: 'userPool' }
            );

            console.log('Rejection response:', response);

            if (response.data) {
                // 🔹 First close the reject reason modal
                setShowRejectModal(false);

                // 🔹 Delay slightly before setting success modal to ensure UI updates properly
                setTimeout(() => {
                    setShowRejectSuccessModal(true);
                }, 100);

                // 🔹 Update formData state after showing the success modal
                setTimeout(() => {
                    setFormData(prev => ({
                        ...prev,
                        status: 'Rejected',
                        rejectionReason: reason,
                        rejectedAt: new Date().toISOString(),
                        rejectedBy: createdBy
                    }));
                }, 100); // Delay to prevent UI flickering
            }
        } catch (error) {
            console.error('Error rejecting submission:', error);
        }
    };



    // ✅ Enhanced button rendering with permission checks
    const renderActionButtons = () => {
        if (isReadOnly) return null;

        if (mode === 'create') {
            return (
                <div className="flex justify-end gap-4 pt-6">
                    <button className="modal-button-primary" type="submit">
                        Submit Injury Report
                    </button>
                </div>
            );
        }

        if (mode.startsWith('investigate')) {
            return (
                <div className="flex justify-end gap-4 pt-6">
                    <button
                        type="button"
                        onClick={() => handleSaveChanges()}
                        className="modal-button-primary"
                    >
                        Update Form
                    </button>
                </div>
            );
        }


    }


    // app/components/forms/InjuryForm.tsx - Fixed handleSaveChanges function

    const handleSaveChanges = async (saveAsDraft: boolean = false) => {
        try {
            setIsLoading(true);
            setError(null); // Keep error state for serious errors only

            console.log('[InjuryForm] Saving changes...', saveAsDraft ? 'As Draft' : 'Normal');

            // ✅ Build update data more carefully with proper typing
            const updateData: any = {
                id: formData.id, // Primary key for update
                submissionId: formData.submissionId,
                updatedBy: createdBy,
                updatedAt: new Date().toISOString(),
            };

            // ✅ Add only the basic form fields that all users can update with proper typing
            const allowedFields: (keyof InjuryFormData)[] = [
                'title', 'dateOfIncident', 'timeOfIncidentHour', 'timeOfIncidentMinute',
                'timeOfInjuryAmPm', 'timeEmployeeBegan', 'timeEmployeeBeganAmPm',
                'locationOnSite', 'whereDidThisOccur', 'workAreaDescription',
                'workActivityCategory', 'incidentDescription', 'injuryDescription',
                'activityType', 'injuryType', 'injuredBodyPart', 'incidentType',
                'employeeType', 'ageRange', 'tenure', 'experience', 'isCovidRelated',
                // US-specific fields
                'employeeId', 'firstName', 'lastName', 'streetAddress', 'city',
                'state', 'zipCode', 'phoneNumber', 'dateOfBirth', 'sex', 'dateHired'
            ];

            // ✅ Only include fields that exist in formData and are allowed - with proper typing
            allowedFields.forEach(field => {
                if (formData[field] !== undefined) {
                    updateData[field] = formData[field];
                }
            });

            // ✅ Set status if saving as draft
            if (saveAsDraft) {
                updateData.status = 'Draft';
            }

            console.log('[InjuryForm] Update data (filtered):', updateData);
            const client = await getDataClient();
            const response = await client.models.Submission.update(
                updateData,
                { authMode: 'userPool' }
            );

            console.log('[InjuryForm] Update response:', response);

            if (response.data) {
                console.log('[InjuryForm] Changes saved successfully');
                // ✅ Use toast notifications instead of state-based success messages
                toast.success(saveAsDraft ? 'Draft saved successfully!' : 'Changes saved successfully!');
            } else if (response.errors && response.errors.length > 0) {
                console.error('[InjuryForm] Update errors:', response.errors);
                throw new Error(`Update failed: ${response.errors[0].message}`);
            } else {
                console.warn('[InjuryForm] No data returned but no errors');
                // ✅ Use toast for this case too
                toast.success(saveAsDraft ? 'Draft saved successfully!' : 'Changes saved successfully!');
            }
        } catch (error) {
            console.error('[InjuryForm] Error saving changes:', error);
            if (error instanceof Error) {
                if (error.message.includes('UnauthorizedException') ||
                    error.message.includes('Access Denied')) {
                    // ✅ Use toast for permission errors
                    toast.error('You do not have permission to update this submission.');
                } else {
                    // ✅ Use toast for other errors
                    toast.error(`Failed to save changes: ${error.message}`);
                }
            } else {
                // ✅ Use toast for unknown errors
                toast.error('Failed to save changes.');
            }
        } finally {
            setIsLoading(false);
        }
    };





    //Save Changes on investigation mode and Save As Draft
    const handleSaveChangesxx = async (saveAsDraft: boolean = false) => {
        try {
            setIsLoading(true);
            setError(null);
            setSuccess(null);

            console.log('[InjuryForm] Saving changes...', saveAsDraft ? 'As Draft' : 'Normal');

            // ✅ Build update data more carefully
            const updateData: any = {
                id: formData.id, // ✅ Primary key for update
                submissionId: formData.submissionId,
                updatedBy: createdBy,
                updatedAt: new Date().toISOString(),
            };

            // ✅ Only include changed fields to avoid conflicts
            if (saveAsDraft) {
                updateData.status = 'Draft';
            }

            // ✅ Add other fields that might have changed
            Object.keys(formData).forEach(key => {
                if (key !== 'id' && key !== 'createdAt' && key !== 'createdBy') {
                    updateData[key] = (formData as any)[key];
                }
            });

            console.log('[InjuryForm] Update data:', updateData);
            const client = await getDataClient();
            const response = await client.models.Submission.update(
                updateData,
                { authMode: 'userPool' });

            console.log('[InjuryForm] Update response:', response);

            if (response.data) {
                console.log('[InjuryForm] Changes saved successfully');
                toast.success(saveAsDraft ? 'Draft saved successfully!' : 'Changes saved successfully!');
            } else if (response.errors && response.errors.length > 0) {
                console.error('[InjuryForm] Update errors:', response.errors);
                throw new Error(`Update failed: ${response.errors[0].message}`);
            } else {
                console.warn('[InjuryForm] No data returned but no errors');
                toast.success(saveAsDraft ? 'Draft saved successfully!' : 'Changes saved successfully!');
            }
        } catch (error) {
            console.error('[InjuryForm] Error saving changes:', error);
            if (error instanceof Error) {
                if (error.message.includes('UnauthorizedException') ||
                    error.message.includes('Access Denied')) {
                    setError('You do not have permission to update this submission.');
                } else {
                    setError(`Failed to save changes: ${error.message}`);
                }
            } else {
                setError('Failed to save changes.');
            }
        } finally {
            setIsLoading(false);
        }
    };





    const renderBasicInfo = () => (


        <div className="grid grid-cols-2 gap-12">
            {/* Left Column */}
            <div className="space-y-6">
                {/* Place all left-column fields here */}


                {/* Location on Site Field = Plant Location */}
                <div className="mb-4">
                    <label className="block tracking-wide text-gray-700 text-xs font-bold mb-2">
                        Plant Location or Employee's Primary Location
                    </label>
                    <select
                        value={formData.locationOnSite || ""}
                        onChange={(e) => {
                            if (isReadOnly) return;
                            setHasFormChanges(true);
                            setFormData((prev) => ({ ...prev, locationOnSite: e.target.value }));
                        }}
                        className="block w-full bg-gray-50 text-gray-700 border border-gray-300 rounded-md py-2 px-2 leading-tight focus:outline-none focus:bg-white focus:border-[#cb4154] focus:ring-[#b22222]"
                    >
                        <option value="">Select</option>
                        {referenceData.locationTypes.map((item) => (
                            <option key={item.id} value={item.value}>
                                {item.label}
                            </option>
                        ))}
                    </select>
                </div>




                {/* Date of Incident */}
                <div>
                    {/* Date of Incident Field */}
                    <label className="block tracking-wide text-gray-700 text-xs font-bold mb-2">Date of Incident</label>
                    <input
                        type="date"
                        name="dateOfIncident"
                        value={formData.dateOfIncident}
                        onChange={(e) => {
                            if (isReadOnly) return;
                            setHasFormChanges(true);
                            setFormData((prev) => ({
                                ...prev,
                                dateOfIncident: e.target.value
                            }));
                        }}
                        disabled={isReadOnly}
                        className={`block w-full bg-gray-50 text-gray-700 border border-gray-300 rounded-md py-2 px-2 leading-tight focus:outline-none focus:bg-white ${isReadOnly ? 'cursor-not-allowed bg-gray-100' : 'focus:border-[#cb4154] focus:ring-[#cb4154]'}`}
                    />

                </div>




                {/* Time of Incident */}
                <div>
                    {/* Time of Incident Field */}
                    <label className="block tracking-wide text-gray-700 text-xs font-bold mb-2">Time Of Incident</label>
                    <div className="flex items-center gap-2">
                        <select
                            value={formData.timeOfIncidentHour}
                            onChange={(e) => {
                                setHasFormChanges(true);
                                setFormData((prev) => ({
                                    ...prev,
                                    timeOfIncidentHour: e.target.value
                                }));
                            }}
                            className="block w-full bg-gray-50 text-gray-700 border border-gray-300 rounded-md py-2 px-2 leading-tight focus:outline-none focus:bg-white focus:border-[#cb4154] focus:ring-[#b22222]"
                        >
                            {[...Array(12)].map((_, i) => (
                                <option key={i} value={(i + 1).toString().padStart(2, '0')}>
                                    {(i + 1).toString().padStart(2, '0')}
                                </option>
                            ))}
                        </select>
                        <span>:</span>
                        <select
                            value={formData.timeOfIncidentMinute}
                            onChange={(e) => {
                                setHasFormChanges(true);
                                setFormData((prev) => ({
                                    ...prev,
                                    timeOfIncidentMinute: e.target.value
                                }));
                            }}
                            className="block w-full bg-gray-50 text-gray-700 border border-gray-300 rounded-md py-2 px-2 leading-tight focus:outline-none focus:bg-white focus:border-[#cb4154] focus:ring-[#cb4154]"
                        >
                            {[...Array(60)].map((_, i) => (
                                <option key={i} value={i.toString().padStart(2, '0')}>
                                    {i.toString().padStart(2, '0')}
                                </option>
                            ))}
                        </select>
                        <select
                            value={formData.timeOfInjuryAmPm}
                            onChange={(e) => {
                                setHasFormChanges(true);
                                setFormData((prev) => ({
                                    ...prev,
                                    timeOfInjuryAmPm: e.target.value
                                }));
                            }}
                            className="block w-full bg-gray-50 text-gray-700 border border-gray-300 rounded-md py-2 px-2 leading-tight focus:outline-none focus:bg-white focus:border-[#cb4154] focus:ring-[#cb4154]"
                        >
                            <option value="AM">AM</option>
                            <option value="PM">PM</option>
                        </select>
                    </div>
                </div>


                {/* Where Did this Occur?*/}
                <div className="mb-4">
                    <label className="block tracking-wide text-gray-700 text-xs font-bold mb-2">
                        Where did this Occur?
                    </label>
                    <select
                        value={formData.whereDidThisOccur || ""}
                        onChange={(e) => {
                            if (isReadOnly) return;
                            setHasFormChanges(true);
                            setFormData((prev) => ({ ...prev, whereDidThisOccur: e.target.value }));
                        }}
                        className="block w-full bg-gray-50 text-gray-700 border border-gray-300 rounded-md py-2 px-2 leading-tight focus:outline-none focus:bg-white focus:border-[#cb4154] focus:ring-[#b22222]"
                    >
                        <option value="">Select</option>
                        {referenceData.whereDidThisOccur.map((item) => (
                            <option key={item.id} value={item.value}>
                                {item.label}
                            </option>
                        ))}
                    </select>
                </div>


                <div>
                    {/* Work Area Description Field - Additional Location Detail*/}
                    <label className="block tracking-wide text-gray-700 text-xs font-bold mb-2">Additional Location Detail (Optional)</label>
                    <textarea
                        placeholder="Specific details about the work area where the incident occurred (<200 characters)"
                        value={formData.workAreaDescription || ""}
                        onChange={(e) => {
                            if (isReadOnly) return;
                            setHasFormChanges(true);
                            setFormData((prev) => ({ ...prev, workAreaDescription: e.target.value }));
                        }}
                        readOnly={isReadOnly}
                        maxLength={200}
                        className={`appearance-none block w-full text-gray-700 border border-gray-300 rounded py-6 px-4 leading-tight placeholder:italic placeholder:text-xs placeholder:font-mono ${isReadOnly
                            ? 'bg-gray-100 focus:outline-none focus:border-gray-300 focus:ring-0 resize-y' // ✅ Allow resizing vertically
                            : 'bg-gray-50 focus:outline-none focus:bg-white focus:border-[#b22222] resize-y'
                            }`}
                        rows={3}
                    />


                </div>




                <div>
                    {/* Activity Type Field */}
                    <label className="block tracking-wide text-gray-700 text-xs font-bold mb-2">Work Activity Type</label>
                    <select
                        value={formData.activityType || ""}
                        onChange={(e) => {
                            setHasFormChanges(true);;
                            setFormData((prev) => ({ ...prev, activityType: e.target.value }));
                        }}
                        className="block w-full bg-gray-50 text-gray-700 border border-gray-300 rounded-md py-2 px-2 leading-tight focus:outline-none focus:bg-white focus:border-[#cb4154] focus:ring-[#cb4154]"

                    >
                        <option value="">Select</option>
                        {referenceData.activityTypes.map((item) => (
                            <option key={item.id} value={item.value}>
                                {item.label}
                            </option>
                        ))}
                    </select>
                </div>



                <div>
                    {/* Incident Type */}
                    <label className="block tracking-wide text-gray-700 text-xs font-bold mb-2">Incident Type</label>
                    <select
                        value={formData.incidentType || ""}
                        onChange={(e) => {
                            setHasFormChanges(true);
                            setFormData((prev) => ({ ...prev, incidentType: e.target.value }));
                        }}
                        className="block w-full bg-gray-50 text-gray-700 border border-gray-300 rounded-md py-2 px-2 leading-tight focus:outline-none focus:bg-white focus:border-[#cb4154] focus:ring-[#cb4154]"

                    >
                        <option value="">Select</option>
                        {referenceData.incidentTypes.map((item) => (
                            <option key={item.id} value={item.value}>
                                {item.label}
                            </option>
                        ))}
                    </select>
                </div>












            </div>

            {/* Right Column */}
            <div className="space-y-6">
                {/* Place all right-column fields here */}

                {/* Title Field */}
                <div>

                    <label className="block tracking-wide text-gray-700 text-xs font-bold mb-2">Title</label>
                    <textarea
                        placeholder="Short Event Description (<40 characters)"
                        value={formData.title || ""}
                        onChange={(e) => {
                            setHasFormChanges(true);
                            setFormData((prev) => ({ ...prev, title: e.target.value }));
                        }}
                        maxLength={40}
                        className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-300 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-[#cb4154] height: 60px placeholder:text-xs placeholder:font-mono"
                    //rows={2}
                    />
                </div>



                <div className="mb-4">
                    <label className="block tracking-wide text-gray-700 text-xs font-bold mb-2">
                        Incident Description
                    </label>
                    <textarea
                        placeholder="Briefly describe the incident (<500 characters)"
                        value={formData.incidentDescription || ""}
                        onChange={(e) => {
                            setHasFormChanges(true);
                            setFormData((prev) => ({ ...prev, incidentDescription: e.target.value }));
                        }}
                        maxLength={500}
                        className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-300 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-[#cb4154] placeholder:text-xs placeholder:font-mono"
                        rows={4}
                    />
                </div>

                <div>
                    {/* Injury Description Field */}
                    <label className="block tracking-wide text-gray-700 text-xs font-bold mb-2">Injury Description</label>
                    <textarea
                        placeholder="Briefly describe the injury (<500 characters)"
                        value={formData.injuryDescription || ""}
                        onChange={(e) => {
                            setHasFormChanges(true);
                            setFormData((prev) => ({ ...prev, injuryDescription: e.target.value }));
                        }}
                        maxLength={500}
                        className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-300 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-[#cb4154] placeholder:text-xs placeholder:font-mono"
                        rows={4}

                    />
                </div>


                {/*Injured Body Part */}
                <div>
                    <label className="block tracking-wide text-gray-700 text-xs font-bold mb-2">
                        Injured Body Part
                    </label>
                    <div className="relative">
                        <select
                            value={formData.injuredBodyPart[0] || ""}
                            onChange={(e) => {
                                const value = e.target.value;
                                setHasFormChanges(true);
                                setFormData((prev) => ({
                                    ...prev,
                                    injuredBodyPart: value ? [value] : [], // ✅ Only one value allowed
                                }));
                            }}
                            className="block w-full bg-gray-50 text-gray-700 border border-gray-300 rounded-md py-2 px-2 leading-tight focus:outline-none focus:bg-white focus:border-[#cb4154] focus:ring-[#cb4154]"
                        >
                            <option value="">Select</option>
                            {referenceData.injuredBodyParts.map((item) => (
                                <option key={item.id} value={item.value}>
                                    {item.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>


                {/*Injury Type  */}
                <div>
                    <label className="block tracking-wide text-gray-700 text-xs font-bold mb-2">
                        Injury Type
                    </label>
                    <div className="relative">
                        <select
                            value={formData.injuryType[0] || ""}
                            onChange={(e) => {
                                const value = e.target.value;
                                setHasFormChanges(true);
                                setFormData((prev) => ({
                                    ...prev,
                                    injuryType: value ? [value] : [], // ✅ Only allow one selection
                                }));
                            }}
                            className="block w-full bg-gray-50 text-gray-700 border border-gray-300 rounded-md py-2 px-2 leading-tight focus:outline-none focus:bg-white focus:border-[#cb4154] focus:ring-[#cb4154]"
                        >
                            <option value="">Select</option>
                            {referenceData.injuryTypes.map((item) => (
                                <option key={item.id} value={item.value}>
                                    {item.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Is COVID-19 Related */}
                <div className="mb-4">
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                        Is this COVID-19 Related?
                    </label>
                    <div className="flex gap-4 mt-1">
                        <label className="inline-flex items-center">
                            <input
                                type="radio"
                                name="isCovidRelated"
                                value="Yes"
                                checked={formData.isCovidRelated === "Yes"}
                                onChange={() => {
                                    setHasFormChanges(true);
                                    setFormData((prev) => ({ ...prev, isCovidRelated: "Yes" }));
                                }}
                                className="custom-radio"
                            />
                            <span className="ml-2 text-[#800000] font-medium">Yes</span>
                        </label>
                        <label className="inline-flex items-center">
                            <input
                                type="radio"
                                name="isCovidRelated"
                                value="No"
                                checked={formData.isCovidRelated === "No"}
                                onChange={() => {
                                    setHasFormChanges(true);
                                    setFormData((prev) => ({ ...prev, isCovidRelated: "No" }));
                                }}
                                className="custom-radio"
                            />
                            <span className="ml-2 text-[#800000] font-medium">No</span>
                        </label>
                        <label className="inline-flex items-center">
                            <input
                                type="radio"
                                name="isCovidRelated"
                                value="Unsure"
                                checked={formData.isCovidRelated === "Unsure"}
                                onChange={() => {
                                    setHasFormChanges(true);
                                    setFormData((prev) => ({ ...prev, isCovidRelated: "Unsure" }));
                                }}
                                className="custom-radio"
                            />
                            <span className="ml-2 text-[#800000] font-medium">Unsure</span>
                        </label>
                    </div>
                </div>





            </div>
        </div>
    );




    const renderDemographicFields = () => (

        <div className="grid grid-cols-2 gap-12">
            {/* Employee Type */}
            <div>
                {/* Employee Type Field */}
                <label className="block tracking-wide text-gray-700 text-xs font-bold mb-2">Employee Type</label>
                {/* Employee Type */}
                <select
                    value={formData.employeeType}
                    onChange={(e) => {
                        setHasFormChanges(true);
                        setFormData((prev) => ({ ...prev, employeeType: e.target.value }));
                    }}
                    className="block w-full bg-gray-50 text-gray-700 border border-gray-300 rounded-md py-2 px-2 leading-tight focus:outline-none focus:bg-white focus:border-[#cb4154] focus:ring-[#b22222]"
                >
                    <option value="">Select</option>
                    {referenceData.employeeTypes.map((item) => (
                        <option key={item.id} value={item.value}>
                            {item.label}
                        </option>
                    ))}
                </select>

            </div>

            {/* Age Range */}
            <div>
                {/* Age Range Field */}
                <label className="block tracking-wide text-gray-700 text-xs font-bold mb-2">Age Range</label>
                <select
                    value={formData.ageRange || ""}
                    onChange={(e) => {
                        setHasFormChanges(true);;
                        setFormData((prev) => ({ ...prev, ageRange: e.target.value }));
                    }}
                    className="block w-full bg-gray-50 text-gray-700 border border-gray-300 rounded-md py-2 px-2 leading-tight focus:outline-none focus:bg-white focus:border-[#cb4154] focus:ring-[#b22222]"
                >
                    <option value="">Select</option>
                    {referenceData.ageRanges.map((item) => (
                        <option key={item.id} value={item.value}>
                            {item.label}
                        </option>
                    ))}
                </select>
            </div>

            {/* Tenure */}
            <div>
                {/* Tenure Field */}
                <label className="block tracking-wide text-gray-700 text-xs font-bold mb-2">Experience at ITW</label>
                <select
                    value={formData.tenure || ""}
                    onChange={(e) => {
                        setHasFormChanges(true);
                        setFormData((prev) => ({ ...prev, tenure: e.target.value }));
                    }}
                    className="block w-full bg-gray-50 text-gray-700 border border-gray-300 rounded-md py-2 px-2 leading-tight focus:outline-none focus:bg-white focus:border-[#cb4154] focus:ring-[#b22222]"
                >
                    <option value="">Select</option>
                    {referenceData.tenureRanges.map((item) => (
                        <option key={item.id} value={item.value}>
                            {item.label}
                        </option>
                    ))}
                </select>
            </div>

            {/* Experience */}
            <div>
                {/* Experience Field */}
                <label className="block tracking-wide text-gray-700 text-xs font-bold mb-2">Experience in Role</label>
                <select
                    value={formData.experience || ""}
                    onChange={(e) => {
                        setHasFormChanges(true);
                        setFormData((prev) => ({ ...prev, experience: e.target.value }));
                    }}
                    className="block w-full bg-gray-50 text-gray-700 border border-gray-300 rounded-md py-2 px-2 leading-tight focus:outline-none focus:bg-white focus:border-[#cb4154] focus:ring-[#b22222]"
                >
                    <option value="">Select</option>
                    {referenceData.experienceLevels.map((item) => (
                        <option key={item.id} value={item.value}>
                            {item.label}
                        </option>
                    ))}
                </select>
            </div>
        </div>

    );


    const renderUSFields = () => (

        <div className="grid grid-cols-2 gap-8 mb-8 border-b pb-8">
            <div className="space-y-4">
                <div>
                    <label className="block tracking-wide text-gray-700 text-xs font-bold mb-2">Your Employee ID</label>
                    <input
                        type="text"
                        value={formData.employeeId || ""}
                        onChange={(e) => {
                            setHasFormChanges(true);
                            setFormData(prev => ({ ...prev, employeeId: e.target.value }));
                        }}
                        className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-300 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-[#cb4154]"
                    //required
                    />
                </div>

                <div>
                    <label className="block tracking-wide text-gray-700 text-xs font-bold mb-2">Your First Name</label>
                    <input
                        type="text"
                        value={formData.firstName || ""}
                        onChange={(e) => {
                            setHasFormChanges(true);
                            setFormData(prev => ({ ...prev, firstName: e.target.value }));
                        }}
                        className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-300 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-[#cb4154]"
                    //required
                    />
                </div>

                <div>
                    <label className="block tracking-wide text-gray-700 text-xs font-bold mb-2">Your Last Name</label>
                    <input
                        type="text"
                        value={formData.lastName || ""}
                        onChange={(e) => {
                            setHasFormChanges(true);
                            setFormData(prev => ({ ...prev, lastName: e.target.value }));
                        }}
                        className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-300 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-[#cb4154]"
                    //required
                    />
                </div>

                <div>
                    <label className="block tracking-wide text-gray-700 text-xs font-bold mb-2">Date of Birth</label>
                    <input
                        type="date"
                        value={formData.dateOfBirth}
                        onChange={(e) => {
                            setHasFormChanges(true);
                            setFormData(prev => ({ ...prev, dateOfBirth: e.target.value }));
                        }}
                        className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-300 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-[#cb4154]"
                    //required
                    />
                </div>

                <div>
                    <label className="block tracking-wide text-gray-700 text-xs font-bold mb-2">Sex</label>
                    <select
                        value={formData.sex || ""}
                        onChange={(e) => {
                            setHasFormChanges(true);
                            setFormData(prev => ({ ...prev, sex: e.target.value }));
                        }}
                        className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-300 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-[#cb4154]"
                    //required
                    >
                        <option value="">Select</option>
                        <option value="Female">Female</option>
                        <option value="Male">Male</option>
                    </select>
                </div>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="block tracking-wide text-gray-700 text-xs font-bold mb-2">Street Address</label>
                    <input
                        type="text"
                        value={formData.streetAddress || ""}
                        onChange={(e) => {
                            setHasFormChanges(true);
                            setFormData(prev => ({ ...prev, streetAddress: e.target.value }));
                        }}
                        className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-300 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-[#cb4154]"
                    //required
                    />
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <label className="block tracking-wide text-gray-700 text-xs font-bold mb-2">City</label>
                        <input
                            type="text"
                            value={formData.city || ""}
                            onChange={(e) => {
                                setHasFormChanges(true);
                                setFormData(prev => ({ ...prev, city: e.target.value }));
                            }}
                            className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-300 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-[#cb4154]"
                        //required
                        />
                    </div>
                    <div>
                        <label className="block tracking-wide text-gray-700 text-xs font-bold mb-2">State</label>
                        <input
                            type="text"
                            value={formData.state || ""}
                            onChange={(e) => {
                                setHasFormChanges(true);
                                setFormData(prev => ({ ...prev, state: e.target.value }));
                            }}
                            className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-300 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-[#cb4154]"
                        //required
                        />
                    </div>
                    <div>
                        <label className="block tracking-wide text-gray-700 text-xs font-bold mb-2">ZIP Code</label>
                        <input
                            type="text"
                            value={formData.zipCode || ""}
                            onChange={(e) => {
                                setHasFormChanges(true);
                                setFormData(prev => ({ ...prev, zipCode: e.target.value }));
                            }}
                            className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-300 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-[#cb4154]"
                        //required
                        />
                    </div>
                </div>

                <div>
                    <label className="block tracking-wide text-gray-700 text-xs font-bold mb-2">Phone Number</label>
                    <input
                        type="tel"
                        value={formData.phoneNumber || ""}
                        onChange={(e) => {
                            setHasFormChanges(true);
                            setFormData(prev => ({ ...prev, phoneNumber: e.target.value }));
                        }}
                        className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-300 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-[#cb4154]"
                    //required
                    />
                </div>

                <div>
                    <label className="block tracking-wide text-gray-700 text-xs font-bold mb-2">Date Hired</label>
                    <input
                        type="date"
                        value={formData.dateHired}
                        onChange={(e) => {
                            setHasFormChanges(true);
                            setFormData(prev => ({ ...prev, dateHired: e.target.value }));
                        }}
                        className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-300 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-[#cb4154]"
                    //required
                    />
                </div>
            </div>
        </div>
    );










    return (
        <main className="flex justify-center items-start bg-gray-50">
            <div className="w-full max-w-5xl">
                <h1 className="text-xl font-semibold text-[#b22222] border-l-4 border-[#b22222] pl-3">
                    {formType} Injury Form
                </h1>

                <div className="w-full max-w-5xl bg-white shadow-lg rounded-lg p-6">
                    {/* Header with Report ID */}
                    <div className="bg-gray-100 p-4 rounded-t-lg border-b border-gray-200">
                        <div className="flex justify-between items-center max-w-7xl mx-auto">
                            {/* <div className="flex items-center">
                                {/* ✅ Show user's permission level 
                                {userAccess && (
                                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                        {userAccess.roleTitle} (Level {userAccess.level})
                                    </span>
                                )}
                            </div>*/}
<div className="ml-auto text-sm text-gray-600">
      Report ID#{" "}
      {(mode === "edit" || mode.startsWith("investigate-"))
        ? formData.submissionId
        : submission.reportId}
    </div>



                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4 bg-white rounded-lg shadow-sm p-1">
                        {/* ✅ Error Display */}
                        {error && (
                            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                                <div className="flex">
                                    <div className="text-red-800">
                                        <h3 className="text-sm font-medium">Error</h3>
                                        <p className="mt-1 text-sm">{error}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Common fields */}
                        {renderBasicInfo()}
                        {/* Divider Line */}
                        <div className="h-1 w-full bg-red-50 rounded-md my-6"></div>
                        {/* Demographics Content*/}
                        {renderDemographicFields()}
                        {/* Divider Line */}
                        <div className="h-1 w-full bg-red-50 rounded-md my-6"></div>
                        {/* Employee Information (Required By OSHA) */}
                        {/* US-specific Fields Section */}
                        {formType === 'US' && renderUSFields()}

                        {/* ✅ Permission-based button rendering */}

                        {/* ✅ Fixed button logic based on actual permissions */}
                        {!isReadOnly && (
                            mode === 'create' ? (
                                <div className="flex justify-end gap-4 pt-6">
                                    <button className="modal-button-primary" type="submit">
                                        Submit Injury Report
                                    </button>
                                </div>
                            ) : mode.startsWith('investigate') ? (
                                <div className="flex justify-end gap-4 pt-6">
                                    <button
                                        type="button"
                                        onClick={() => handleSaveChanges()}
                                        className="modal-button-primary"
                                    >
                                        Update Form
                                    </button>
                                </div>
                            ) : (
                                <div className="pt-6">
                                    {/* ✅ Buttons Row */}
                                    <div className="flex justify-end gap-4">
                                        {/* ✅ Save as Draft - EVERYONE can save draft */}
                                        <button
                                            type="button"
                                            className="modal-button-update"
                                            onClick={() => handleSaveChanges(true)}
                                            disabled={isLoading}
                                        >
                                            {isLoading ? "Saving..." : "Save As Draft"}
                                        </button>

                                        {/* ✅ Reject & Next Step - ONLY for users with canTakeFirstReportActions */}
                                        {canTakeFirstReportActions && (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() => saveChangesAndContinue(() => setShowRejectModal(true))}
                                                    className="modal-button-reject"
                                                    disabled={isLoading}
                                                >
                                                    {isLoading ? "Saving..." : "Reject"}
                                                </button>
                                                <button
                                                    type="button"
                                                    className="modal-button-primary"
                                                    onClick={() => saveChangesAndContinue(() => setShowClassificationModal(true))}
                                                    disabled={isLoading}
                                                >
                                                    {isLoading ? "Saving..." : "Next Step"}
                                                </button>
                                            </>
                                        )}
                                    </div>

                                    {/* ✅ Show message below buttons for users who can't take actions */}
                                    {!canTakeFirstReportActions && (
                                        <div className="mt-3 text-center">
                                            <div className="inline-flex items-center px-3 py-2 bg-amber-50 border border-amber-200 rounded-md">
                                                <svg className="w-4 h-4 text-amber-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                                </svg>
                                                <span className="text-sm text-amber-800 font-medium">
                                                    You can save drafts but cannot take first report actions
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        )}


                    </form>
                </div>
            </div>

            {/* MODELS */}
            {/* Reject Modal */}
            <RejectModal
                isOpen={showRejectModal}
                onClose={() => setShowRejectModal(false)}
                onReject={handleReject}
                reportId={formData.submissionId}
            />
            {showRejectSuccessModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full">
                        <h3 className="text-lg font-medium mb-4">Rejection Successful</h3>
                        <p className="mb-4">Report <span className="font-medium">{formData.submissionId}</span> has been rejected successfully.</p>
                        <div className="flex justify-end">
                            <button
                                onClick={() => {
                                    setShowRejectSuccessModal(false);
                                    router.push('/first-reports/injury');
                                }}
                                className="px-4 py-2 bg-[#b22222] text-white rounded hover:bg-[#800000] focus:outline-none"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ✅ Classification Modal */}
            <ClassificationModal
                isOpen={showClassificationModal}
                onClose={() => setShowClassificationModal(false)}
                submissionId={formData.submissionId}
                formType={formType}
                initialData={formData}
            />

            {/* Save Confirmation Modal */}
            <SaveSuccessModal isOpen={showSuccessModal} onClose={handleCloseModal} />

            {/* <-- new DocumentsModal here */}
            <DocumentsModal
                isOpen={showDocsModal}
                onClose={() => setShowDocsModal(false)}
                submissionId={formData.submissionId}
                existingDocuments={formData.documents}
                onSave={handleDocumentsSave}
            />
        </main>
    );








}
