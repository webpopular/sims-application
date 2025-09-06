// app/components/forms/sections/LessonsLearnedSection.tsx - FIXED to remove duplicate approver selection

"use client";

import {
  useEffect,
  useState,
  forwardRef,
  useImperativeHandle,
  ForwardRefRenderFunction,
  useRef,
} from "react";
import { ChevronDown, ChevronRight, Download, X } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { getCurrentUser } from "aws-amplify/auth";
import { generateClient } from "aws-amplify/data";
import { getUrl, remove, uploadData } from "aws-amplify/storage";
import type { LessonsLearned, InjuryFormData, llDocuments } from "@/app/types";
import { type Schema } from "@/amplify/data/schema";
import { getUserInfo } from '@/lib/utils/getUserInfo';
import { useUserAccess } from '@/app/hooks/useUserAccess';
import LessonsLearnedEmailNotification from '@/app/components/forms/notifications/LessonsLearnedEmailNotification';

const client = generateClient<Schema>();
type ApprovalStatus = 'LL_NOT_SENT' | 'LL_SENT_FOR_APPROVAL' | 'LL_APPROVED' | 'LL_SENT_BACK_FOR_REVISION';

const statusLabels: Record<LessonsLearned["lessonsLearnedApprovalStatus"], string> = {
  LL_NOT_SENT: "Not Sent",
  LL_SENT_FOR_APPROVAL: "Sent for Approval",
  LL_APPROVED: "Approved",
  LL_SENT_BACK_FOR_REVISION: "Sent Back for Revision"
};

export interface LessonsLearnedSectionHandle {
  getData: () => LessonsLearned[];
}

interface LessonsLearnedSectionProps {
  isExpanded: boolean;
  onToggle: () => void;
  onSave: (sectionName: string, data: LessonsLearned[]) => Promise<void>;
  submissionId: string;
  formData?: Partial<InjuryFormData> | null;
  setInjuryFormData?: React.Dispatch<React.SetStateAction<Partial<InjuryFormData> | null>>;
  setHasFormChanges?: (value: boolean) => void;
  existingLessons?: LessonsLearned[];
  referenceData: {
    locationTypes: { id: string; value: string; label: string }[];
  };
  formType: 'US' | 'Global';
}

const LessonsLearnedSection: ForwardRefRenderFunction<
  LessonsLearnedSectionHandle,
  LessonsLearnedSectionProps
> = (
  {
    isExpanded,
    onToggle,
    onSave,
    submissionId,
    formData,
    setInjuryFormData,
    setHasFormChanges,
    referenceData,
    formType,
  },
  ref
) => {
    const { userAccess } = useUserAccess();
    const [username, setUsername] = useState("Unknown");
    const [lesson, setLesson] = useState<LessonsLearned | null>(null);
    const [editing, setEditing] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isApprover, setIsApprover] = useState(false);

    // ✅ ONLY Email modal state
    const [showEmailModal, setShowEmailModal] = useState(false);

    // ✅ FIXED: Send for approval handler - opens email modal directly
    const handleSendForApproval = () => {
      if (!lesson) return;
      
      // Check if required fields are filled
      if (!lesson.lessonsLearnedTitle || !lesson.lessonDescription) {
        alert('Please fill in the lesson title and description before sending for approval.');
        return;
      }
      
      // Open email modal directly
      setShowEmailModal(true);
    };

    // ✅ FIXED: Email success handler - updates approver info
    const handleEmailSuccess = (selectedApprover: string, approverName: string) => {
      if (lesson) {
        const updatedLesson = {
          ...lesson,
          lessonsLearnedApprovalStatus: 'LL_SENT_FOR_APPROVAL' as const,
          lessonsLearnedSentforApprovalAt: new Date().toISOString(),
          lessonsLearnedSentforApprovalBy: username,
          lessonsLearnedSenttoApprover: selectedApprover,
          lessonsLearnedApprover: selectedApprover
          // ✅ You can now use approverName if needed
        };
        setLesson(updatedLesson);
        onSave("lessonslearned", [updatedLesson]);
      }
    };

    useImperativeHandle(ref, () => ({
      getData: () => (lesson ? [lesson] : []),
    }));

    useEffect(() => {
      const checkUser = async () => {
        const info = await getUserInfo();
        setUsername(info.email || info.username || "Unknown");
        setIsApprover(info.groups?.includes("approvers") ?? false);
      };
      checkUser();
    }, []);

    useEffect(() => {
      const init = async () => {
        try {
          const user = await getCurrentUser();
          setUsername(user?.signInDetails?.loginId || "Unknown");

          const { data } = await client.models.Submission.list({
            filter: { submissionId: { eq: submissionId } },
          });

          const record = data[0];
          if (record?.lessonsLearned?.[0]) {
            const fetchedLesson = record.lessonsLearned[0];
            const sanitizedLesson: LessonsLearned = {
              llid: fetchedLesson.llid ?? uuidv4(),
              lessonsLearnedAuthor: fetchedLesson.lessonsLearnedAuthor ?? "",
              lessonsLearnedTitle: fetchedLesson.lessonsLearnedTitle ?? "",
              lessonsLearnedSegment: fetchedLesson.lessonsLearnedSegment ?? "",
              lessonsLearnedLocation: fetchedLesson.lessonsLearnedLocation ?? "",
              lessonsLearnedKeyWords: fetchedLesson.lessonsLearnedKeyWords ?? "",
              lessonsLearnedApprover: fetchedLesson.lessonsLearnedApprover ?? "",
              lessonsLearnedDocuments: (fetchedLesson.lessonsLearnedDocuments ?? []).filter((doc): doc is llDocuments => doc !== null),
              lessonDescription: fetchedLesson.lessonDescription ?? "",
              keyTakeaways: fetchedLesson.keyTakeaways ?? "",
              uploadedAt: fetchedLesson.uploadedAt ?? new Date().toISOString(),
              uploadedBy: fetchedLesson.uploadedBy ?? username,
              lessonsLearnedApprovalStatus: fetchedLesson.lessonsLearnedApprovalStatus || "LL_NOT_SENT",
              lessonsLearnedSentforApprovalBy: fetchedLesson.lessonsLearnedSentforApprovalBy || "",
              lessonsLearnedSentforApprovalAt: fetchedLesson.lessonsLearnedSentforApprovalAt || "",
              lessonsLearnedSenttoApprover: fetchedLesson.lessonsLearnedSenttoApprover || "",
            };
            setLesson(sanitizedLesson);
            setShowForm(true);
            setEditing(false);
          }
        } catch (err) {
          console.error("Error loading Lessons Learned:", err);
        } finally {
          setIsLoading(false);
        }
      };
      init();
    }, [submissionId]);

    // Approval action handler
    const handleApprovalAction = async (action: 'approve' | 'sendBack') => {
      if (!lesson) return;
      const status: LessonsLearned['lessonsLearnedApprovalStatus'] =
        action === 'approve' ? 'LL_APPROVED' : 'LL_SENT_BACK_FOR_REVISION';

      const updatedLesson: LessonsLearned = {
        ...lesson,
        lessonsLearnedApprovalStatus: status,
      };

      setLesson(updatedLesson);
      await onSave("lessonslearned", [updatedLesson]);
    };

    // Check if current user is designated approver
    const isDesignatedApprover = lesson && username && 
      (lesson.lessonsLearnedSenttoApprover === username || lesson.lessonsLearnedApprover === username);

    const handleSave = async () => {
      if (!lesson) return;
      const updated = {
        ...lesson,
        lessonsLearnedAuthor: username,
        uploadedBy: username,
        uploadedAt: lesson.uploadedAt || new Date().toISOString(),
        llid: lesson.llid || uuidv4(),
      };
      setLesson(updated);
      setEditing(false);
      setHasFormChanges?.(false);
      await onSave("lessonslearned", [updated]);
    };

    const handleCreate = () => {
      setLesson({
        llid: uuidv4(),
        lessonsLearnedAuthor: username,
        lessonsLearnedTitle: "",
        lessonsLearnedSegment: "",
        lessonsLearnedLocation: formData?.locationOnSite || "",
        lessonsLearnedKeyWords: "",
        lessonsLearnedApprover: "",
        lessonsLearnedDocuments: [],
        lessonDescription: "",
        keyTakeaways: "",
        uploadedAt: new Date().toISOString(),
        uploadedBy: username,
        lessonsLearnedApprovalStatus: 'LL_NOT_SENT',
        lessonsLearnedSentforApprovalBy: "",
        lessonsLearnedSentforApprovalAt: "",
        lessonsLearnedSenttoApprover: "",
      });
      setShowForm(true);
      setEditing(true);
      setHasFormChanges?.(true);
    };

    // ✅ Keep all your existing functions (handleUpload, handleChange, etc.)
    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files?.length || !lesson) return;

      setUploading(true);
      try {
        const file = e.target.files[0];
        const uniqueId = uuidv4();
        const fileName = `${submissionId}/lessons/${Date.now()}-${uniqueId}-${file.name}`;

        const userInfo = await getUserInfo();
        const uploadedBy = userInfo.email || userInfo.username || "Unknown";

        await uploadData({
          key: fileName,
          data: file,
          options: {
            bucket: { bucketName: "simsstorage2.0", region: "us-east-1" },
            contentType: file.type,
          },
        });

        const s3Key = `public/${fileName}`;
        const newDoc: llDocuments = {
          docId: uniqueId,
          fileName: file.name,
          s3Key,
          uploadedAt: new Date().toISOString(),
          uploadedBy,
          size: file.size,
          type: file.type,
        };

        const updatedDocs = [...(lesson.lessonsLearnedDocuments ?? []), newDoc];
        const updatedLesson = { ...lesson, lessonsLearnedDocuments: updatedDocs };
        setLesson(updatedLesson);
        setHasFormChanges?.(true);
      } catch (err) {
        console.error("Upload failed:", err);
        alert("Failed to upload file.");
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };

    const handleChange = (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
      if (!lesson) return;
      const { name, value } = e.target;
      setLesson({ ...lesson, [name]: value });
      setHasFormChanges?.(true);
    };

    const handleDownload = async (doc: llDocuments) => {
      try {
        const key = doc.s3Key.startsWith("public/") ? doc.s3Key.slice(7) : doc.s3Key;
        const { url } = await getUrl({
          key,
          options: {
            bucket: { bucketName: "simsstorage2.0", region: "us-east-1" },
            validateObjectExistence: true,
          },
        });
        window.open(url, "_blank");
      } catch (err) {
        console.error("Download error:", err);
        alert("Download failed.");
      }
    };

    const handleDelete = async (doc: llDocuments) => {
      if (!lesson) return;
      try {
        const key = doc.s3Key.startsWith("public/") ? doc.s3Key.slice(7) : doc.s3Key;
        await remove({
          key,
          options: {
            bucket: { bucketName: "simsstorage2.0", region: "us-east-1" },
          },
        });

        const updatedDocs = (lesson.lessonsLearnedDocuments ?? []).filter(d => d.docId !== doc.docId);
        setLesson({ ...lesson, lessonsLearnedDocuments: updatedDocs });
        setHasFormChanges?.(true);
      } catch (err) {
        console.error("Delete failed:", err);
        alert("Delete failed.");
      }
    };

    const renderDocumentTable = () => {
      if (!lesson?.lessonsLearnedDocuments?.length) return null;

      const isReadOnly = lesson.lessonsLearnedApprovalStatus === "LL_APPROVED";

      return (
        <div className="space-y-2 mt-4">
          {lesson.lessonsLearnedDocuments.map((doc) => (
            <div
              key={doc.docId}
              className="flex items-center justify-between p-2 bg-gray-50 rounded shadow-sm"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4">
                <span className="text-sm">{doc.fileName}</span>
                <span className="text-xs text-gray-500">{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                <span className="text-xs text-gray-500">{(doc.size / 1024).toFixed(2)} KB</span>
                <span className="text-xs text-gray-500">Uploaded by: {doc.uploadedBy}</span>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => handleDownload(doc)}
                  className="inline-flex items-center px-2 py-1 border border-blue-500 text-blue-600 text-xs rounded hover:bg-blue-50"
                >
                  <Download className="w-4 h-4 mr-1" /> Download
                </button>

                {!isReadOnly && (
                  <button
                    onClick={() => handleDelete(doc)}
                    className="inline-flex items-center px-2 py-1 border border-red-500 text-red-600 text-xs rounded hover:bg-red-50"
                  >
                    <X className="w-4 h-4 mr-1" /> Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      );
    };

    const renderUploadInput = () => {
      if (lesson?.lessonsLearnedApprovalStatus === "LL_APPROVED") return null;

      return (
        <div className="mt-4">
          <label className="block text-xs font-bold text-gray-700 mb-1">Upload Lesson Document</label>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleUpload}
            disabled={uploading}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100"
          />
          {uploading && <p className="text-sm text-gray-500">Uploading...</p>}
        </div>
      );
    };

    const renderQuestion = () => (
      <div className="mb-4">
        <label className="text-sm font-medium text-gray-700">
          Do you wish to create a Lessons Learned?
        </label>
        <div className="flex gap-4 mt-1">
          <label className="inline-flex items-center">
            <input
              type="radio"
              checked={showForm}
              onChange={handleCreate}
              className="custom-radio"
            />
            <span className="ml-2 text-[#800000] font-medium">Yes</span>
          </label>
          <label className="inline-flex items-center">
            <input
              type="radio"
              checked={!showForm}
              onChange={() => setShowForm(false)}
              className="custom-radio"
            />
            <span className="ml-2 text-[#800000] font-medium">No</span>
          </label>
        </div>
      </div>
    );

    const renderForm = () => {
      if (!lesson) return null;
      const lessonNonNull = lesson;

      return (
        <>
          {/* Approval Banner */}
          {lessonNonNull.lessonsLearnedApprovalStatus === "LL_APPROVED" && (
            <div className="flex items-center bg-green-50 border border-green-200 text-green-800 text-sm px-4 py-2 rounded-md mb-4">
              <svg
                className="w-4 h-4 mr-2 text-green-500"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 15v2m0-6v2m0-6v2m6 6h2a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4 0V5a2 2 0 00-2-2H10a2 2 0 00-2 2v2M6 7H4a2 2 0 00-2 2v6a2 2 0 002 2h2"
                />
              </svg>
              <span>
                This lesson has been <strong>approved</strong> and is now read-only.
              </span>
            </div>
          )}

          {showForm && lesson && (
            <div className="space-y-4">
              {/* Author & Title Card - Keep all existing fields */}
              <div className="card-container">
                <div className="card-header uppercase text-sm font-semibold">Basic Information</div>
                <div className="card-body">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block tracking-wide text-gray-700 text-xs font-bold mb-1">
                        Author <span className="text-gray-300 text-xs italic font-mono">(read-only)</span>
                      </label>
                      <input readOnly value={username} className="bg-gray-100 text-gray-600 border rounded-md p-2 w-full" />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Lessons Learned Title</label>
                      <input
                        name="lessonsLearnedTitle"
                        value={lessonNonNull.lessonsLearnedTitle}
                        onChange={handleChange}
                        readOnly={!editing}
                        className={`border rounded-md p-2 w-full ${!editing ? 'bg-gray-100' : ''}`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Segment</label>
                      <select
                        name="lessonsLearnedSegment"
                        value={lessonNonNull.lessonsLearnedSegment}
                        onChange={handleChange}
                        disabled={!editing}
                        className="border rounded-md p-2 w-full"
                      >
                        <option value="Automotive">Automotive</option>
                        <option value="Construction">Construction</option>
                        <option value="Specialty Products">Specialty Products</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Date</label>
                      <input
                        type="date"
                        name="uploadedAt"
                        value={lessonNonNull.uploadedAt?.split("T")[0]}
                        onChange={(e) => setLesson({ ...lessonNonNull, uploadedAt: new Date(e.target.value).toISOString() })}
                        readOnly={!editing}
                        className={`border rounded-md p-2 w-full ${!editing ? 'bg-gray-100' : ''}`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Location</label>
                      <select
                        name="lessonsLearnedLocation"
                        value={lessonNonNull.lessonsLearnedLocation}
                        onChange={(e) => {
                          if (!editing) return;
                          setLesson({ ...lessonNonNull, lessonsLearnedLocation: e.target.value });
                          setHasFormChanges?.(true);
                        }}
                        disabled={!editing}
                        className="border rounded-md p-2 w-full bg-white"
                      >
                        <option value="">Select Location</option>
                        {referenceData.locationTypes.map((item: { id: string; value: string; label: string }) => (
                          <option key={item.id} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description Card - Keep all existing fields */}
              <div className="card-container">
                <div className="card-header uppercase text-sm font-semibold">Description & Takeaways</div>
                <div className="card-body space-y-4">
                  <div className="mb-4">
                    <label className="block text-xs font-bold text-gray-700 mb-1">Key Words</label>
                    <input
                      name="lessonsLearnedKeyWords"
                      value={lessonNonNull.lessonsLearnedKeyWords}
                      onChange={handleChange}
                      readOnly={!editing}
                      className={`border rounded-md p-2 w-full ${!editing ? 'bg-gray-100' : ''}`}
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-xs font-bold text-gray-700 mb-1">Lesson Description</label>
                    <textarea
                      name="lessonDescription"
                      value={lessonNonNull.lessonDescription}
                      onChange={handleChange}
                      rows={3}
                      readOnly={!editing}
                      className={`border rounded-md p-2 w-full ${!editing ? 'bg-gray-100' : ''}`}
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-xs font-bold text-gray-700 mb-1">Key Takeaways</label>
                    <textarea
                      name="keyTakeaways"
                      value={lessonNonNull.keyTakeaways}
                      onChange={handleChange}
                      rows={3}
                      readOnly={!editing}
                      className={`border rounded-md p-2 w-full ${!editing ? 'bg-gray-100' : ''}`}
                    />
                  </div>
                </div>
              </div>

              {/* Documents Card - Keep existing */}
              <div className="card-container">
                <div className="card-header uppercase text-sm font-semibold">Supporting Documents</div>
                <div className="card-body">
                  {renderUploadInput()}
                  {renderDocumentTable()}
                </div>
              </div>

              {/* ✅ FIXED: Approval Status Card - REMOVED duplicate approver selection */}
              <div className="card-container">
                <div className="card-header uppercase text-sm font-semibold">Approval & Status</div>
                <div className="card-body">
                  {/* ✅ ONLY show current approver info when there is one */}
                  {lessonNonNull.lessonsLearnedApprover && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Current Approver
                      </label>
                      <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md">
                        <span className="text-sm text-gray-800">
                          {lessonNonNull.lessonsLearnedSenttoApprover || lessonNonNull.lessonsLearnedApprover}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Status Information - Only show if sent for approval */}
                  {lessonNonNull && lessonNonNull.lessonsLearnedApprovalStatus !== "LL_NOT_SENT" && (
                    <div className="bg-gray-50 p-4 rounded border border-gray-200 mb-4">
                      <div className="flex items-center mb-4 pb-3 border-b border-gray-200">
                        <span className="text-sm font-medium mr-2">Status:</span>
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                          lessonNonNull.lessonsLearnedApprovalStatus === "LL_APPROVED" 
                            ? "bg-green-100 text-green-800" 
                            : lessonNonNull.lessonsLearnedApprovalStatus === "LL_SENT_FOR_APPROVAL"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-amber-100 text-amber-800"
                        }`}>
                          {statusLabels[lessonNonNull.lessonsLearnedApprovalStatus]}
                        </span>
                      </div>
                      
                      <div className="flex flex-col space-y-3">
                        <div className="flex">
                          <div className="w-1/3 text-sm font-medium text-gray-600">Sent to:</div>
                          <div className="w-2/3 text-sm text-gray-800">
                            {lessonNonNull.lessonsLearnedSenttoApprover || "Not specified"}
                          </div>
                        </div>
                        
                        <div className="flex">
                          <div className="w-1/3 text-sm font-medium text-gray-600">Sent by:</div>
                          <div className="w-2/3 text-sm text-gray-800">
                            {lessonNonNull.lessonsLearnedSentforApprovalBy || "Not available"}
                          </div>
                        </div>
                        
                        <div className="flex">
                          <div className="w-1/3 text-sm font-medium text-gray-600">Sent at:</div>
                          <div className="w-2/3 text-sm text-gray-800">
                            {lessonNonNull.lessonsLearnedSentforApprovalAt 
                              ? new Date(lessonNonNull.lessonsLearnedSentforApprovalAt).toLocaleString() 
                              : "Not available"}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ✅ ENHANCED: Action Buttons */}
                  <div className="flex flex-wrap gap-3 justify-end">
                    {/* ✅ ENHANCED: Edit Lesson Button - Shows for all non-approved lessons */}
                    {!editing && lessonNonNull.lessonsLearnedApprovalStatus !== "LL_APPROVED" && (
                      <button
                        onClick={() => setEditing(true)}
                        className="px-4 py-2 border border-gray-600 text-gray-700 bg-white rounded hover:bg-gray-50 transition flex items-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit Lesson
                      </button>
                    )}

                    {/* Save Button */}
                    {editing && (
                      <button
                        onClick={handleSave}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition flex items-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V7a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        Save Changes
                      </button>
                    )}

                    {/* ✅ ENHANCED: Send for Approval / Reassign Approver Button */}
                    {!editing && 
                     lessonNonNull && 
                     ["LL_NOT_SENT", "LL_SENT_BACK_FOR_REVISION"].includes(lessonNonNull.lessonsLearnedApprovalStatus) && (
                      <button
                        onClick={handleSendForApproval}
                        className="px-4 py-2 border border-blue-600 text-blue-700 bg-white rounded hover:bg-blue-50 transition flex items-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                        {lessonNonNull.lessonsLearnedApprover ? 'Reassign Approver' : 'Send for Approval'}
                      </button>
                    )}

                    {/* ✅ ADDED: Reassign Approver Button for sent lessons */}
                    {!editing && 
                     lessonNonNull.lessonsLearnedApprovalStatus === 'LL_SENT_FOR_APPROVAL' && (
                      <button
                        onClick={handleSendForApproval}
                        className="px-4 py-2 border border-orange-600 text-orange-700 bg-white rounded hover:bg-orange-50 transition flex items-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                        Reassign Approver
                      </button>
                    )}

                    {/* Approve Button - Only for designated approvers */}
                    {!editing && 
                     lessonNonNull.lessonsLearnedApprovalStatus === 'LL_SENT_FOR_APPROVAL' && 
                     isDesignatedApprover && (
                      <>
                        <button
                          onClick={() => handleApprovalAction('approve')}
                          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition flex items-center"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          ✅ Approve Lessons Learned
                        </button>
                        <button
                          onClick={() => handleApprovalAction('sendBack')}
                          className="px-4 py-2 border border-amber-500 text-amber-600 bg-white rounded hover:bg-amber-50 transition flex items-center"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                          </svg>
                          Send Back for Revision
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      );
    };

    return (
      <div className="border-b">
        <button
          onClick={(e) => {
            e.preventDefault();
            onToggle();
          }}
          className={`w-full flex justify-between items-center px-4 py-3 text-sm font-medium transition-all duration-200 border-b border-gray-200 last:border-b-0
  ${isExpanded ? "bg-red-50" : "bg-white"} 
  hover:bg-red-200 hover:text-sm rounded-md`}
        >
          <div className="flex items-center">
            {isExpanded ? <ChevronDown className="h-5 w-5 mr-2" /> : <ChevronRight className="h-5 w-5 mr-2" />}
            <span>Lessons Learned</span>
          </div>

          {/* Status pill(s) */}
          <div className="flex items-center space-x-2">
            {lesson ? (
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${lesson.lessonsLearnedApprovalStatus === "LL_APPROVED"
                  ? "bg-green-100 text-green-800"
                  : lesson.lessonsLearnedApprovalStatus === "LL_SENT_FOR_APPROVAL"
                    ? "bg-yellow-100 text-yellow-800"
                    : lesson.lessonsLearnedApprovalStatus === "LL_SENT_BACK_FOR_REVISION"
                      ? "bg-red-100 text-red-800"
                      : "bg-gray-100 text-gray-600"
                  }`}
              >
                {statusLabels[lesson.lessonsLearnedApprovalStatus]}
              </span>
            ) : (
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                Not Created
              </span>
            )}
          </div>
        </button>

        {isExpanded && (
          <div className="p-4 bg-white shadow-sm rounded-b-md">
            {isLoading ? (
              <p className="text-gray-500">Loading...</p>
            ) : showForm ? (
              <>
                {lesson && renderForm()}
              </>
            ) : (
              renderQuestion()
            )}
          </div>
        )}

        {/* ✅ Email Notification Modal */}
        {showEmailModal && (
          <LessonsLearnedEmailNotification
            isOpen={showEmailModal}
            onClose={() => setShowEmailModal(false)}
            onSuccess={handleEmailSuccess} // ✅ Now matches the expected signature
            lessonId={lesson?.llid || ''}
            title={lesson?.lessonsLearnedTitle}
            lessonData={lesson}
          />
        )}
      </div>
    );
  };

LessonsLearnedSection.displayName = "LessonsLearnedSection";
export default forwardRef(LessonsLearnedSection);
