//app/components/forms/sections/RCASection.tsx
'use client';
import { ChevronDown, ChevronRight, Download, X } from "lucide-react";
import {
  forwardRef,
  useState,
  useImperativeHandle,
  useEffect,
  ForwardRefRenderFunction,
  useRef,
} from "react";
import { v4 as uuidv4 } from "uuid";
import { getCurrentUser } from "aws-amplify/auth";
import type { RCA, rcaDocuments } from "@/app/types";
import { getUserInfo } from "@/lib/utils/getUserInfo";
import { getUrl, remove, uploadData } from "aws-amplify/storage";
import { useLookupData } from "@/app/utils/useLookupData";
import { generateClient } from "aws-amplify/data";
import { Schema } from "@/amplify/data/schema";
import { fetchAuthSession } from 'aws-amplify/auth';
import RCACompletionModal from "../../modals/RCACompletionModal";
import toast from 'react-hot-toast';
 
export interface RCASectionHandle {
  getData: () => RCA[];
}

const client = generateClient<Schema>();
interface RCASectionProps {
  isExpanded: boolean;
  onToggle: () => void;
  onSave: (sectionName: string, data: RCA[]) => Promise<void>;
  submissionId: string;
  existingRCAData: RCA[];
}

const RCASection: ForwardRefRenderFunction<RCASectionHandle, RCASectionProps> = (
  { isExpanded, onToggle, onSave, submissionId, existingRCAData },
  ref
) => {
  const [rcaList, setRCAList] = useState<RCA[]>(existingRCAData);
  const [newRca, setNewRca] = useState<RCA>(() => ({
    rcaId: uuidv4(),
    rcaDirectCauseWho: "",
    rcaDirectCauseWhen: "",
    rcaDirectCauseWhere: "",
    rcaDirectCauseWhat: "",
    rcaDirectCauseHow: "",
    rcaDirectCauseGroup: "",
    rcaDirectCauseSubGroup: "",
    rcaIdentifyDirectCause: "",
    rcaRootCauseWhy1: "",
    rcaRootCauseWhy2: "",
    rcaRootCauseWhy3: "",
    rcaRootCauseWhy4: "",
    rcaRootCauseWhy5: "",
    isRCAComplete: "Yet to Begin", // <-- default here
    uploadedAt: "",
    uploadedBy: "",
    rcaUploadedDocuments: [],
  }));
  const [showRCAForm, setShowRCAForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<any>({});
 
  //const [editingRca, setEditingRca] = useState<string | null>(null);
  const [editingRca, setEditingRca] = useState<any>(null);

  const [user, setUser] = useState<any>(null);
  const [rcaOptionSelected, setRcaOptionSelected] = useState<string>('');
  const [showRCABuiltInForm, setShowRCABuiltInForm] = useState<boolean>(true);
  const rcaFileInputRef = useRef<HTMLInputElement>(null);
  const [rcaDocuments, setRcaDocuments] = useState<rcaDocuments[]>([]);
  const [uploadingRCA, setUploadingRCA] = useState(false);
  const [uploadedDocRCAList, setUploadedDocRCAList] = useState<RCA[]>([]);
  const { referenceData, getOptions } = useLookupData();
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [currentRcaId, setCurrentRcaId] = useState<string | null>(null);

  const directCauseGroupMap = referenceData.directCauseGroupMap || {};
  const groupOptions = Object.keys(directCauseGroupMap);
  const selectedSubGroups: string[] =
    newRca.rcaDirectCauseGroup && directCauseGroupMap[newRca.rcaDirectCauseGroup]
      ? directCauseGroupMap[newRca.rcaDirectCauseGroup]
      : [];

  const handleUploadedDocRCAStatusChange = (rcaId: string, status: string) => {
    if (status === "Complete") {
      setCurrentRcaId(rcaId);
      setShowCompletionModal(true);
    } else {
      const updated = uploadedDocRCAList.map((rca) =>
        rca.rcaId === rcaId ? { ...rca, isRCAComplete: status } : rca
      );
      setUploadedDocRCAList(updated);
      onSave("rca", [...rcaList, ...updated]);
    }
  };


  const rootCauses = getOptions("Root Cause");

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (existingRCAData?.length > 0) {
      setRCAList(existingRCAData.filter(r => !!r.rcaDirectCauseWho));
      setUploadedDocRCAList(existingRCAData.filter(r => r.rcaUploadedDocuments && !r.rcaDirectCauseWho));
    }
  }, [existingRCAData]);


  const handleOptionChange = (value: string) => {
    setRcaOptionSelected(value);
    setShowRCABuiltInForm(value === 'Built-in SIMS RCA Tool');
  };


  const handleRemoveUploadedDocRCA = async (rcaId: string) => {
    const updated = uploadedDocRCAList.filter((rca) => rca.rcaId !== rcaId);
    setUploadedDocRCAList(updated);
    await onSave("rca", [...rcaList, ...updated]);
  };




  // Add this function to handle modal save
  const handleCompletionModalSave = (data: {
    rcaDirectCauseGroup: string;
    rcaDirectCauseSubGroup: string;
    rcaIdentifyDirectCause: string;
  }) => {
    if (!currentRcaId) return;

    const updated = uploadedDocRCAList.map((rca) =>
      rca.rcaId === currentRcaId ? {
        ...rca,
        isRCAComplete: "Complete",
        rcaDirectCauseGroup: data.rcaDirectCauseGroup,
        rcaDirectCauseSubGroup: data.rcaDirectCauseSubGroup,
        rcaIdentifyDirectCause: data.rcaIdentifyDirectCause
      } : rca
    );

    setUploadedDocRCAList(updated);
    onSave("rca", [...rcaList, ...updated]);
    setShowCompletionModal(false);
    setCurrentRcaId(null);
  };

  const handleRCAUploadxx = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setUploadingRCA(true);
    try {
      const file = e.target.files[0];
      const uniqueId = uuidv4();

      // Fetch the user's Cognito identityId for correct S3 pathing
      const session = await fetchAuthSession();
      const identityId = session.identityId;

      // Create path with proper structure including identityId
      const fileName = `${submissionId}/rca/${Date.now()}-${uniqueId}-${file.name}`;
      const s3Path = `public/${identityId}/${fileName}`;

      const userInfo = await getUserInfo();
      const uploadedBy = userInfo.email || userInfo.username || "Unknown";

      console.log('Uploading RCA document to path:', s3Path);

      // Use path parameter instead of key
      await uploadData({
        path: s3Path,
        data: file,
        options: {
          bucket: { bucketName: "simsstorage2.0", region: "us-east-1" },
          contentType: file.type,
          onProgress: ({ transferredBytes, totalBytes }) => {
            if (totalBytes) {
              console.log(`Upload progress: ${Math.round((transferredBytes / totalBytes) * 100)}%`);
            }
          }
        }
      }).result;

      // Create a new RCA record for the document
      const newDoc: rcaDocuments = {
        docId: uniqueId,
        fileName: file.name,
        s3Key: s3Path, // Store the full path including identityId
        uploadedAt: new Date().toISOString(),
        uploadedBy,
        size: file.size,
        type: file.type,
      };

      // Create a new RCA record for the document
      const newDocRCA: RCA = {
        rcaId: uuidv4(),
        uploadedAt: newDoc.uploadedAt,
        uploadedBy: newDoc.uploadedBy,
        rcaUploadedDocuments: [newDoc],
        // all other fields can be empty strings
        rcaDirectCauseWho: "",
        rcaDirectCauseWhen: "",
        rcaDirectCauseWhere: "",
        rcaDirectCauseWhat: "",
        rcaDirectCauseHow: "",
        rcaDirectCauseGroup: "",
        rcaDirectCauseSubGroup: "",
        rcaIdentifyDirectCause: "",
        rcaRootCauseWhy1: "",
        rcaRootCauseWhy2: "",
        rcaRootCauseWhy3: "",
        rcaRootCauseWhy4: "",
        rcaRootCauseWhy5: "",
        isRCAComplete: "Yet to Begin", // Set a default status
      };

      // Update the uploadedDocRCAList and persist
      const updatedDocList = [...uploadedDocRCAList, newDocRCA];
      setUploadedDocRCAList(updatedDocList);
      await onSave("rca", [...rcaList, ...updatedDocList]);

    } catch (err) {
      console.error("Upload RCA failed:", err);
      alert("Upload failed.");
    } finally {
      setUploadingRCA(false);
      if (rcaFileInputRef.current) rcaFileInputRef.current.value = "";
    }
  };


  const handleRCAUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setUploadingRCA(true);
  
    try {
      const file = e.target.files[0];
      const uniqueId = uuidv4();
  
      // Check if this file already exists in any RCA record
      const existingDoc = existingRCAData?.find(rca => 
        rca.rcaUploadedDocuments?.some((doc: any) => 
          doc.fileName === file.name && doc.size === file.size
        )
      );
  
      if (existingDoc) {
        toast.error('This document has already been uploaded');
        return;
      }
  
      const session = await fetchAuthSession();
      const identityId = session.identityId;
      const fileName = `${submissionId}/rca/${Date.now()}-${uniqueId}-${file.name}`;
      const s3Path = `public/${identityId}/${fileName}`;
  
      const userInfo = await getUserInfo();
      const uploadedBy = userInfo.email || userInfo.username || "Unknown";
  
      await uploadData({
        path: s3Path,
        data: file,
        options: {
          bucket: { bucketName: "simsstorage2.0", region: "us-east-1" },
          contentType: file.type,
          onProgress: ({ transferredBytes, totalBytes }) => {
            if (totalBytes) {
              console.log(`Upload progress: ${Math.round((transferredBytes / totalBytes) * 100)}%`);
            }
          }
        }
      }).result;
  
      const newDoc: rcaDocuments = {
        docId: uniqueId,
        fileName: file.name,
        s3Key: s3Path,
        uploadedAt: new Date().toISOString(),
        uploadedBy,
        size: file.size,
        type: file.type,
      };
  
      // Find existing RCA entry with documents or create new one
      let updatedDocRCAList = [...uploadedDocRCAList];
      let documentRCAIndex = updatedDocRCAList.findIndex(rca => 
        rca.rcaUploadedDocuments && rca.rcaUploadedDocuments.length > 0
      );
  
      if (documentRCAIndex !== -1) {
        // Add to existing RCA entry, checking for duplicates
        const existingRCA = updatedDocRCAList[documentRCAIndex];
        const isDuplicate = existingRCA.rcaUploadedDocuments?.some(doc => 
          doc.docId === newDoc.docId || (doc.fileName === newDoc.fileName && doc.size === newDoc.size)
        );
  
        if (!isDuplicate) {
          updatedDocRCAList[documentRCAIndex] = {
            ...existingRCA,
            rcaUploadedDocuments: [...(existingRCA.rcaUploadedDocuments || []), newDoc],
            uploadedAt: newDoc.uploadedAt,
            uploadedBy: newDoc.uploadedBy,
            //rcaStatus: 'ACTION_IN_PROGRESS' as 'ACTION_IN_PROGRESS'
          };
        } else {
          toast.error('Document already exists in this RCA');
          return;
        }
      } else {
        // Create new RCA entry
        const newDocRCA: RCA = {
          rcaId: uuidv4(),
          uploadedAt: newDoc.uploadedAt,
          uploadedBy: newDoc.uploadedBy,
          rcaUploadedDocuments: [newDoc],
          rcaDirectCauseWho: "",
          rcaDirectCauseWhen: "",
          rcaDirectCauseWhere: "",
          rcaDirectCauseWhat: "",
          rcaDirectCauseHow: "",
          rcaDirectCauseGroup: "",
          rcaDirectCauseSubGroup: "",
          rcaIdentifyDirectCause: "",
          rcaRootCauseWhy1: "",
          rcaRootCauseWhy2: "",
          rcaRootCauseWhy3: "",
          rcaRootCauseWhy4: "",
          rcaRootCauseWhy5: "",
          isRCAComplete: "Yet to Begin",
          //rcaStatus: 'ACTION_IN_PROGRESS' as 'ACTION_IN_PROGRESS'
        };
        updatedDocRCAList.push(newDocRCA);
      }
  
      setUploadedDocRCAList(updatedDocRCAList);
  
      // Merge and save without duplicates
      const allRCAIds = new Set(updatedDocRCAList.map(rca => rca.rcaId));
      const mergedRCAList = [
        ...rcaList.filter(rca => !allRCAIds.has(rca.rcaId)),
        ...updatedDocRCAList,
      ];
      
      await onSave("rca", mergedRCAList);
  
      // Fix the document extraction logic
      const allDocs = updatedDocRCAList.reduce((docs: rcaDocuments[], rca: RCA) => {
        return [...docs, ...(rca.rcaUploadedDocuments || [])];
      }, []); // Start with empty array of rcaDocuments[]

      setRcaDocuments(allDocs);

  
      toast.success('Document uploaded successfully');
  
    } catch (err) {
      console.error("Upload RCA failed:", err);
      toast.error("Upload failed.");
    } finally {
      setUploadingRCA(false);
      if (rcaFileInputRef.current) rcaFileInputRef.current.value = "";
    }
  };
  
  

 



  const handleRCADownload = async (doc: rcaDocuments) => {
    try {
      // Use the full s3Key path directly - it already contains the identityId
      const { url } = await getUrl({
        path: doc.s3Key,
        options: {
          bucket: { bucketName: "simsstorage2.0", region: "us-east-1" },
          validateObjectExistence: true,
        },
      });
      window.open(url, "_blank");
    } catch (err) {
      console.error("Download RCA error:", err);
      alert("Download failed: " + (err instanceof Error ? err.message : String(err)));
    }
  };




  const handleRCADeletexx = async (doc: rcaDocuments) => {
    try {
      // Use the full s3Key path directly - it already contains the identityId
      await remove({
        path: doc.s3Key,
        options: {
          bucket: { bucketName: "simsstorage2.0", region: "us-east-1" },
        },
      });

      setRcaDocuments((prev) => prev.filter((d) => d.docId !== doc.docId));
    } catch (err) {
      console.error("Delete RCA failed:", err);
      alert("Delete failed: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleRCADelete = async (doc: rcaDocuments) => {
    try {
      await remove({
        path: doc.s3Key,
        options: {
          bucket: { bucketName: "simsstorage2.0", region: "us-east-1" },
        },
      });
  
      // Remove from local state
      setRcaDocuments((prev) => prev.filter((d) => d.docId !== doc.docId));
  
      // Update RCA records
      const updatedDocRCAList = uploadedDocRCAList.map(rca => {
        if (rca.rcaUploadedDocuments?.some(d => d.docId === doc.docId)) {
          const updatedDocs = rca.rcaUploadedDocuments.filter(d => d.docId !== doc.docId);
          return {
            ...rca,
            rcaUploadedDocuments: updatedDocs,
            rcaStatus: updatedDocs.length > 0 ? 'ACTION_IN_PROGRESS' : 'NOT_STARTED'
          };
        }
        return rca;
      });
  
      setUploadedDocRCAList(updatedDocRCAList);
  
      // Save updated RCA list
      const mergedRCAList = [...rcaList, ...updatedDocRCAList];
      await onSave("rca", mergedRCAList);
  
      toast.success("Document removed successfully");
    } catch (err) {
      console.error("Delete RCA failed:", err);
      toast.error("Delete failed: " + (err instanceof Error ? err.message : String(err)));
    }
  };
  



  useImperativeHandle(ref, () => ({
    getData: () => rcaList,
  }));

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setNewRca((prev) => ({
      ...prev,
      [name]: value,
      uploadedAt: new Date().toISOString(),
      uploadedBy: user?.username || "",
    }));
  };

  const handleSaveRcaxx = () => {
    if (editingRca) {
      const updatedRcaList = rcaList.map((rca) =>
        rca.rcaId === editingRca
          ? { ...newRca, rcaId: editingRca, rcaUploadedDocuments: rcaDocuments }
          : rca
      );
      setRCAList(updatedRcaList);
      onSave("rca", updatedRcaList);
      setEditingRca(null);
    } else {
      const newRcaWithId: RCA = {
        ...newRca,
        rcaId: uuidv4(),
        rcaUploadedDocuments: rcaDocuments,
      };
      const updatedRcaList = [...rcaList, newRcaWithId];
      setRCAList(updatedRcaList);
      onSave("rca", updatedRcaList);
    }
    resetNewRca();
    setRcaDocuments([]);
  };

  const handleSaveRca = async () => {
    try {
      setIsLoading(true);
      
      const rcaData = {
        ...formData,
        rcaId: editingRca?.rcaId || uuidv4(),
        uploadedAt: new Date().toISOString(),
        uploadedBy: 'current_user'
      };
  
      // ✅ CRITICAL FIX: Preserve ALL existing uploaded documents
      const allExistingDocuments = existingRCAData?.reduce((docs: any[], rca: any) => {
        return [...docs, ...(rca.rcaUploadedDocuments || [])];
      }, []) || [];
  
      // Always preserve uploaded documents in the new RCA entry
      if (allExistingDocuments.length > 0) {
        rcaData.rcaUploadedDocuments = allExistingDocuments;
      }
  
      let updatedRCAList: any[];
      
      if (editingRca) {
        // Update existing RCA entry while preserving documents
        updatedRCAList = rcaList.map((rca: any) => 
          rca.rcaId === editingRca.rcaId ? rcaData : rca
        );
        setRCAList(updatedRCAList);
      } else {
        // Add new RCA entry
        updatedRCAList = [...rcaList, rcaData];
        setRCAList([...rcaList, rcaData]);
      }
  
      // ✅ CRITICAL FIX: Merge with uploaded document RCAs instead of replacing
      const documentRCAs = uploadedDocRCAList.filter((rca: any) => 
        rca.rcaUploadedDocuments && rca.rcaUploadedDocuments.length > 0
      );
      
      // Ensure no duplicate RCA IDs and preserve all data
      const allRCAIds = new Set(updatedRCAList.map((rca: any) => rca.rcaId));
      const preservedDocumentRCAs = documentRCAs.filter((rca: any) => !allRCAIds.has(rca.rcaId));
      
      const finalMergedRCAList = [...updatedRCAList, ...preservedDocumentRCAs];
      
      await onSave('rca', finalMergedRCAList);
  
      setEditingRca(null);
      setFormData({});
      setShowRCAForm(false);
      toast.success('RCA saved successfully');
    } catch (error) {
      console.error('Error saving RCA:', error);
      toast.error('Failed to save RCA');
    } finally {
      setIsLoading(false);
    }
  };
  

  // The critical function for saving uploaded docs (Own Tool/Forms)
  const handleSaveUploadedRcaDocs = () => {
    if (rcaDocuments.length === 0) return;
    const newRcaWithDocs: RCA = {
      rcaId: uuidv4(),
      uploadedAt: new Date().toISOString(),
      uploadedBy: user?.username || "",
      rcaUploadedDocuments: rcaDocuments,
      // ...other fields as needed
    };
    const updatedRcaList = [...rcaList, newRcaWithDocs];
    setRCAList(updatedRcaList);
    onSave("rca", updatedRcaList);
    resetNewRca();
    setRcaDocuments([]);
  };

  const handleEditRca = (rcaId: string) => {
    const rcaToEdit = rcaList.find((rca) => rca.rcaId === rcaId);
    if (rcaToEdit) {
      setNewRca(rcaToEdit);
      setRcaDocuments(rcaToEdit.rcaUploadedDocuments || []);
      //setEditingRca(rcaId);
      setEditingRca(rcaToEdit); // ← Store the entire object, not just the ID

      // Force the radio group to select the built-in tool and show the form
      setRcaOptionSelected('Built-in SIMS RCA Tool');
      setShowRCABuiltInForm(true);
    }
  };


  const handleRemoveRca = (rcaId: string) => {
    const updatedRcaList = rcaList.filter((rca: RCA) => rca.rcaId !== rcaId);
    setRCAList(updatedRcaList);
    onSave("rca", updatedRcaList);
  };

  const resetNewRca = () => {
    setNewRca({
      rcaId: uuidv4(),
      rcaDirectCauseWho: "",
      rcaDirectCauseWhen: "",
      rcaDirectCauseWhere: "",
      rcaDirectCauseWhat: "",
      rcaDirectCauseHow: "",
      rcaDirectCauseGroup: "",
      rcaDirectCauseSubGroup: "",
      rcaIdentifyDirectCause: "",
      rcaRootCauseWhy1: "",
      rcaRootCauseWhy2: "",
      rcaRootCauseWhy3: "",
      rcaRootCauseWhy4: "",
      rcaRootCauseWhy5: "",
      isRCAComplete: "Yet to Begin", // <-- default here
      uploadedAt: "",
      uploadedBy: "",
      rcaUploadedDocuments: [],
    });
    setRcaDocuments([]);
  };

  const getOverallStatusxx = () => {
    if (!rcaList.length) return { text: "Not Created", items: [] };
    const yetToBeginCount = rcaList.filter(item => !item.isRCAComplete || item.isRCAComplete === "").length;
    const inProgressCount = rcaList.filter(item => item.isRCAComplete === "In Progress").length;
    const completedCount = rcaList.filter(item => item.isRCAComplete === "Complete").length;

    let statusItems = [];
    if (yetToBeginCount > 0) {
      statusItems.push({
        text: `Yet to Begin (${yetToBeginCount})`,
        color: "bg-gray-100 text-gray-800"
      });
    }
    if (inProgressCount > 0) {
      statusItems.push({
        text: `In Progress (${inProgressCount})`,
        color: "bg-blue-100 text-blue-800"
      });
    }
    if (completedCount > 0) {
      statusItems.push({
        text: `Completed (${completedCount})`,
        color: "bg-green-100 text-green-800"
      });
    }
    return {
      text: statusItems.map(item => item.text).join(" | ") || "Not Created",
      items: statusItems
    };
  };

  const getOverallStatus = () => {
    // Check for uploaded documents in any RCA record
    const hasUploadedDocuments = existingRCAData?.some((rcaItem: any) => 
      rcaItem.rcaUploadedDocuments && rcaItem.rcaUploadedDocuments.length > 0
    );
  
    if (!rcaList.length && hasUploadedDocuments) {
      return { 
        text: "Created", 
        items: [{ text: "Created", color: "bg-blue-100 text-blue-800" }] 
      };
    }
  
    if (!rcaList.length) return { text: "Not Created", items: [] };
  
    const yetToBeginCount = rcaList.filter((item: any) => !item.isRCAComplete || item.isRCAComplete === "").length;
    const inProgressCount = rcaList.filter((item: any) => item.isRCAComplete === "In Progress").length;
    const completedCount = rcaList.filter((item: any) => item.isRCAComplete === "Complete").length;
  
    let statusItems: { text: string, color: string }[] = [];
  
    if (hasUploadedDocuments && yetToBeginCount === rcaList.length) {
      statusItems.push({
        text: "Created",
        color: "bg-blue-100 text-blue-800"
      });
    } else {
      if (yetToBeginCount > 0) {
        statusItems.push({
          text: `Yet to Begin (${yetToBeginCount})`,
          color: "bg-gray-100 text-gray-800"
        });
      }
      if (inProgressCount > 0) {
        statusItems.push({
          text: `In Progress (${inProgressCount})`,
          color: "bg-blue-100 text-blue-800"
        });
      }
      if (completedCount > 0) {
        statusItems.push({
          text: `Completed (${completedCount})`,
          color: "bg-green-100 text-green-800"
        });
      }
    }
  
    return {
      text: statusItems.map(item => item.text).join(" | ") || "Not Created",
      items: statusItems
    };
  };
  
  



  return (
    <div className="border-b">
      <button
        onClick={(e) => { e.preventDefault(); onToggle(); }}
        className={`w-full flex justify-between items-center px-4 py-3 text-sm font-medium transition-all duration-200 border-b border-gray-200 last:border-b-0
          ${isExpanded ? "bg-red-50" : "bg-white"} hover:bg-red-200 hover:text-sm rounded-md`}
      >
        <div className="flex items-center">
          {isExpanded ? <ChevronDown className="h-5 w-5 mr-2" /> : <ChevronRight className="h-5 w-5 mr-2" />}
          <span>RCA</span>
          <span className="ml-2 text-xs text-gray-500">({rcaList.length + uploadedDocRCAList.length} analyses)</span>
        </div>
        {/* Status pills */}
        <div className="flex items-center space-x-2">
          {getOverallStatus().items.length > 0 ? (
            getOverallStatus().items.map((item, index) => (
              <span key={index} className={`text-xs px-2 py-0.5 rounded-full ${item.color}`}>
                {item.text}
              </span>
            ))
          ) : (
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100">Not Created</span>
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="p-4">
          {/* RCA Option Selection */}
          <div className="mb-6">
            <label className="text-sm font-medium text-gray-700">
              Choose how you want to complete the RCA:
            </label>
            <div className="flex gap-6 mt-2">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="rcaOption"
                  value="Built-in SIMS RCA Tool"
                  checked={rcaOptionSelected === 'Built-in SIMS RCA Tool'}
                  onChange={(e) => setRcaOptionSelected(e.target.value)}
                  className="custom-radio"
                />
                <span className="ml-2 text-[#800000] font-medium">Use the built-in SIMS RCA Tool</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="rcaOption"
                  value="Own Tool"
                  checked={rcaOptionSelected === 'Own Tool'}
                  onChange={(e) => setRcaOptionSelected(e.target.value)}
                  className="custom-radio"
                />
                <span className="ml-2 text-[#800000] font-medium">Use Your Own Tool/Forms</span>
              </label>
            </div>
          </div>

          {/* Show RCA Form or Upload based on selection */}
          {rcaOptionSelected === 'Built-in SIMS RCA Tool' && (
            <>
              {/* ... All your RCA form fields ... */}

              <h2 className="text-l font-semibold mb-4 text-gray-600 border-b pb-2">
                {editingRca ? "Edit RCA" : "Add New RCA"}
              </h2>


              <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200 mb-6">
                <div className="bg-slate-50 px-4 py-3 border-b border-gray-200">
                  <h2 className="text-sm font-semibold text-gray-600">Direct Cause</h2>
                </div>

                <div className="p-6 space-y-4">
                  {/* Who */}
                  <div>
                    <label className="block text-gray-700 text-xs uppercase tracking-wider font-bold mb-1">
                      Who was involved in the incident?
                    </label>
                    <input
                      type="text"
                      name="rcaDirectCauseWho"
                      value={newRca.rcaDirectCauseWho}
                      onChange={handleInputChange}
                      className="w-full p-2 border rounded-md focus:ring-2 focus:ring-[#cb4154] bg-white-50"
                      placeholder="Enter names or roles"
                    />
                  </div>
                  {/* When */}
                  <div>
                    <label className="block text-gray-700 text-xs uppercase tracking-wider font-bold mb-1">
                      When did the incident or injury occur?
                    </label>
                    <input
                      type="text"
                      name="rcaDirectCauseWhen"
                      value={newRca.rcaDirectCauseWhen}
                      onChange={handleInputChange}
                      className="w-full p-2 border rounded-md focus:ring-2 focus:ring-[#cb4154] bg-white-50"
                      placeholder="Enter date/time details"
                    />
                  </div>
                  {/* Where */}
                  <div>
                    <label className="block text-gray-700 text-xs uppercase tracking-wider font-bold mb-1">
                      Where did the incident or injury occur?
                    </label>
                    <input
                      type="text"
                      name="rcaDirectCauseWhere"
                      value={newRca.rcaDirectCauseWhere}
                      onChange={handleInputChange}
                      className="w-full p-2 border rounded-md focus:ring-2 focus:ring-[#cb4154] bg-white-50"
                      placeholder="Enter location details"
                    />
                  </div>
                  {/* What */}
                  <div className="md:col-span-2 lg:col-span-1">
                    <label className="block text-gray-700 text-xs uppercase tracking-wider font-bold mb-1">
                      What caused the incident or injury?
                    </label>
                    <textarea
                      name="rcaDirectCauseWhat"
                      value={newRca.rcaDirectCauseWhat}
                      onChange={handleInputChange}
                      className="w-full p-2 border rounded-md focus:ring-2 focus:ring-[#cb4154] bg-white-50"
                      placeholder="Enter cause details"
                      rows={2}
                    />
                  </div>
                  {/* How */}
                  <div className="md:col-span-2 lg:col-span-1">
                    <label className="block text-gray-700 text-xs uppercase tracking-wider font-bold mb-1">
                      How did the incident or injury occur?
                    </label>
                    <textarea
                      name="rcaDirectCauseHow"
                      value={newRca.rcaDirectCauseHow}
                      onChange={handleInputChange}
                      className="w-full p-2 border rounded-md focus:ring-2 focus:ring-[#cb4154] bg-white-50"
                      placeholder="Enter process details"
                      rows={2}
                    />
                  </div>
                </div>
              </div>


              <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200 mb-6">
                <div className="bg-slate-50 px-4 py-3 border-b border-gray-200">
                  <h2 className="text-sm font-semibold text-gray-600">Root Cause (5 Whys)</h2>
                </div>

                <div className="p-6 space-y-4">
                  {[1, 2, 3, 4, 5].map((num) => (
                    <div key={num}>
                      <label className="block text-gray-700 text-xs uppercase tracking-wider font-bold mb-1">
                        Root Cause Why {num}
                      </label>
                      <input
                        type="text"
                        name={`rcaRootCauseWhy${num}`}
                        value={(newRca as any)[`rcaRootCauseWhy${num}`]}
                        onChange={handleInputChange}
                        className="w-full p-2 border rounded-md focus:ring-2 focus:ring-[#cb4154] bg-white-50"
                        placeholder="Enter reason"
                      />
                    </div>
                  ))}
                </div>
              </div>





              <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200 mb-6">
                <div className="bg-slate-50 px-4 py-3 border-b border-gray-200">
                  <h2 className="text-sm font-semibold text-gray-600">RCA Status</h2>
                </div>

                <div className="p-6 space-y-6">
                  {/* RCA Status Selection */}
                  <div className="mb-4">
                    <label className="block text-gray-700 text-xs uppercase tracking-wider font-bold mb-3">
                      RCA Status
                    </label>
                    <div className="flex space-x-6">
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          name="isRCAComplete"
                          value="Yet to Begin"
                          checked={newRca.isRCAComplete === "Yet to Begin"}
                          onChange={handleInputChange}
                          className="form-radio h-5 w-5 text-gray-500"
                        />
                        <span className="ml-2 text-gray-700">Yet to Begin</span>
                      </label>
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          name="isRCAComplete"
                          value="In Progress"
                          checked={newRca.isRCAComplete === "In Progress"}
                          onChange={handleInputChange}
                          className="form-radio h-5 w-5 text-blue-600"
                        />
                        <span className="ml-2 text-gray-700">In Progress</span>
                      </label>
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          name="isRCAComplete"
                          value="Complete"
                          checked={newRca.isRCAComplete === "Complete"}
                          onChange={handleInputChange}
                          className="form-radio h-5 w-5 text-green-600"
                        />
                        <span className="ml-2 text-gray-700">Complete</span>
                      </label>
                    </div>
                  </div>

{/* Direct Cause Group */}
<div className="mb-4">
  <label className="block text-gray-700 text-xs uppercase tracking-wider font-bold mb-2">
    Direct Cause Group
  </label>
  <select
    name="rcaDirectCauseGroup"
    value={newRca.rcaDirectCauseGroup || ""}
    onChange={handleInputChange}
    className="w-full p-3 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
  >
    <option value="">Select Group</option>
    {groupOptions.map((group) => (
      <option key={group} value={group}>{group}</option>
    ))}
  </select>
</div>

{/* Direct Cause Sub Group - ADD THIS NEW DIV */}
{newRca.rcaDirectCauseGroup && selectedSubGroups.length > 0 && (
  <div className="mb-4">
    <label className="block text-gray-700 text-xs uppercase tracking-wider font-bold mb-2">
      Direct Cause Sub Group
    </label>
    <select
      name="rcaDirectCauseSubGroup"
      value={newRca.rcaDirectCauseSubGroup || ""}
      onChange={handleInputChange}
      className="w-full p-3 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
    >
      <option value="">Select Sub Group</option>
      {selectedSubGroups.map((subGroup, index) => (
        <option key={index} value={subGroup}>{subGroup}</option>
      ))}
    </select>
  </div>
)}


                  {/* Root Cause */}
                  <div className="mb-4">
                    <label className="block text-gray-700 text-xs uppercase tracking-wider font-bold mb-2">
                      Root Cause
                    </label>
                    <select
                      name="rcaIdentifyDirectCause"
                      value={newRca.rcaIdentifyDirectCause || ""}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                    >
                      <option value="">Select Root Cause</option>
                      {rootCauses.map(item => (
                        <option key={item.id} value={item.value}>{item.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>




              {/* Save RCA Button */}



              <div className="flex justify-end gap-4 mt-6">
                <button
                  onClick={handleSaveRca}
                  className="modal-button-primary"
                  type="button"
                >
                  {editingRca ? "Save Updates" : "Save RCA"}
                </button>
              </div>
            </>
          )}

          {rcaOptionSelected === 'Own Tool' && (
            <div className="border-t pt-6 mt-6">
              <h3 className="text-md font-semibold mb-4">Upload Your RCA Documents</h3>
              <div className="mb-4">
                <label className="block text-xs font-bold text-gray-700 mb-1">Upload RCA Document</label>
                <input
                  ref={rcaFileInputRef}
                  type="file"
                  onChange={handleRCAUpload}
                  disabled={uploadingRCA}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-full file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100"
                />
                {uploadingRCA && <p className="text-sm text-gray-500 mt-2">Uploading...</p>}
              </div>
            </div>
          )}

{/* Uploaded RCAs (document-only) - Show when no option selected or "Own Tool" is selected */}
{(rcaOptionSelected === '' || rcaOptionSelected === 'Own Tool') && (
  <>
    <h2 className="text-l font-semibold mt-8 mb-4 text-rose-500 border-b pb-2">Uploaded RCAs (Documents)</h2>
    {uploadedDocRCAList.length === 0 ? (
      <div className="text-center py-6 bg-gray-50 rounded-md border border-gray-200 text-gray-500">
        No uploaded RCA documents yet.
      </div>
    ) : (
      <div className="space-y-4">
        {uploadedDocRCAList.map((rca) => (
          <div
            key={rca.rcaId}
            className={`rounded-lg shadow-sm overflow-hidden border ${
              rca.isRCAComplete === "Complete"
                ? "bg-green-50 border-green-200"
                : rca.isRCAComplete === "In Progress"
                  ? "bg-blue-50 border-blue-200"
                  : "bg-gray-50 border-gray-200"
              }`}
          >
 {rca.rcaUploadedDocuments?.map((doc, docIndex) => (
  <div key={`${rca.rcaId}-${doc.docId}-${docIndex}`} className="p-4 border-b border-gray-200">
    <div className="flex justify-between items-center">
      <div className="flex items-center">
        <span className="text-sm font-medium">{doc.fileName}</span>
        <span className="text-xs text-gray-500 ml-2">
          ({(doc.size / 1024).toFixed(1)} KB)
        </span>
      </div>
      <div className="flex gap-2">
 
        <button
          onClick={() => handleRCADelete(doc)}
          className="text-red-600 hover:text-red-800 text-xs"
        >
          Remove
        </button>
      </div>
    </div>
  </div>
))}

            
            {/* Root Cause Analysis section - only shown when Complete */}
            {rca.isRCAComplete === "Complete" && rca.rcaDirectCauseGroup && (
              <div className="p-4 border-b border-gray-200 bg-white bg-opacity-60">
                <h3 className="text-sm font-mono text-gray-700 mb-2">Root Cause Analysis:</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div>
                    <p className="text-xs font-bold text-gray-600">Direct Cause Group:</p>
                    <p className="text-sm">{rca.rcaDirectCauseGroup}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-600">Sub Group:</p>
                    <p className="text-sm">{rca.rcaDirectCauseSubGroup || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-600">Root Cause:</p>
                    <p className="text-sm">{rca.rcaIdentifyDirectCause || 'Not specified'}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Updated on {new Date(rca.uploadedAt).toLocaleDateString()} by {rca.uploadedBy}
                </p>
              </div>
            )}
            
            {/* Status section */}
            <div className="p-4 bg-white bg-opacity-40">
              <div className="flex items-center">
                <span className="text-xs font-bold mr-2">Status:</span>
                {["Yet to Begin", "In Progress", "Complete"].map((status) => (
                  <label key={status} className="inline-flex items-center mr-3">
                    <input
                      type="radio"
                      name={`isRCAComplete-${rca.rcaId}`}
                      value={status}
                      checked={rca.isRCAComplete === status || (!rca.isRCAComplete && status === "Yet to Begin")}
                      onChange={() => handleUploadedDocRCAStatusChange(rca.rcaId, status)}
                      className="form-radio h-4 w-4"
                    />
                    <span className="ml-1 text-xs">{status}</span>
                  </label>
                ))}
                <span
                  className={`ml-auto px-2 py-0.5 rounded-full text-xs ${
                    rca.isRCAComplete === "Complete"
                      ? "bg-green-100 text-green-800"
                      : rca.isRCAComplete === "In Progress"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                >
                  {rca.isRCAComplete || "Yet to Begin"}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    )}
  </>
)}






          {/* Existing RCA Form Entries - Show when no option selected or "Built-in SIMS RCA Tool" is selected */}
          {(rcaOptionSelected === '' || rcaOptionSelected === 'Built-in SIMS RCA Tool') && (
            <>
              <h2 className="text-l font-semibold mt-8 mb-4 text-rose-500 border-b pb-2">Existing RCA Form Entries</h2>
              {rcaList.length === 0 ? (
                <div className="text-center py-6 bg-gray-50 rounded-md border border-gray-200 text-gray-500">
                  No RCA form entries have been added yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {rcaList.map((rca) => (
                    <div
                      key={rca.rcaId}
                      className={`border rounded-md p-4 mb-4 ${rca.isRCAComplete === "Complete"
                        ? "bg-green-50 border-green-200"
                        : rca.isRCAComplete === "In Progress"
                          ? "bg-blue-50 border-blue-200"
                          : "bg-gray-50 border-gray-200"
                        }`}
                    >
                      <div className="space-y-2">
                        <p><span className="text-gray-700 uppercase tracking-wider text-xs font-bold">Direct Cause - Who:</span> {rca.rcaDirectCauseWho || 'Not specified'}</p>
                        <p><span className="text-gray-700 uppercase tracking-wider text-xs font-bold">Direct Cause - When:</span> {rca.rcaDirectCauseWhen || 'Not specified'}</p>
                        <p><span className="text-gray-700 uppercase tracking-wider text-xs font-bold">Direct Cause - Where:</span> {rca.rcaDirectCauseWhere || 'Not specified'}</p>
                        <p><span className="text-gray-700 uppercase tracking-wider text-xs font-bold">Direct Cause - What:</span> {rca.rcaDirectCauseWhat || 'Not specified'}</p>
                        <p><span className="text-gray-700 uppercase tracking-wider text-xs font-bold">Direct Cause - How:</span> {rca.rcaDirectCauseHow || 'Not specified'}</p>

                        <p><span className="text-gray-700 uppercase tracking-wider text-xs font-bold">Root Cause Why 1:</span> {rca.rcaRootCauseWhy1 || 'Not specified'}</p>
                        <p><span className="text-gray-700 uppercase tracking-wider text-xs font-bold">Root Cause Why 2:</span> {rca.rcaRootCauseWhy2 || 'Not specified'}</p>
                        <p><span className="text-gray-700 uppercase tracking-wider text-xs font-bold">Root Cause Why 3:</span> {rca.rcaRootCauseWhy3 || 'Not specified'}</p>
                        <p><span className="text-gray-700 uppercase tracking-wider text-xs font-bold">Root Cause Why 4:</span> {rca.rcaRootCauseWhy4 || 'Not specified'}</p>
                        <p><span className="text-gray-700 uppercase tracking-wider text-xs font-bold">Root Cause Why 5:</span> {rca.rcaRootCauseWhy5 || 'Not specified'}</p>

                        <p><strong>Direct Cause Group:</strong> {rca.rcaDirectCauseGroup || 'N/A'}</p>
                        <p><strong>Sub Group:</strong> {rca.rcaDirectCauseSubGroup || 'N/A'}</p>
                        <p><strong>Root Cause:</strong> {rca.rcaIdentifyDirectCause || 'N/A'}</p>

                        {/* Show uploaded documents, if any */}
                        {rca.rcaUploadedDocuments && rca.rcaUploadedDocuments.length > 0 && (
                          <div className="mt-3">
                            <div className="font-bold text-xs text-gray-700 mb-1">Uploaded Documents:</div>
                            <div className="space-y-1">
                            {rca.rcaUploadedDocuments.map((doc, docIndex) => (
                            <div key={`${rca.rcaId}-${doc.docId}-${docIndex}`} className="flex items-center justify-between bg-gray-100 rounded px-2 py-1">

                                  <span className="text-xs">{doc.fileName}</span>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleRCADownload(doc)}
                                      className="inline-flex items-center px-2 py-1 border border-blue-500 text-blue-600 text-xs rounded hover:bg-blue-50"
                                    >
                                      <Download className="w-4 h-4 mr-1" /> Download
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* RCA Status */}
                        <p>
                          <span className="text-gray-700 uppercase tracking-wider text-xs font-bold">
                            RCA Status:
                          </span>
                          <span
                            className={`ml-1 px-2 py-0.5 rounded-full text-xs inline-block ${rca.isRCAComplete === "Complete"
                              ? "bg-green-100 text-green-800"
                              : rca.isRCAComplete === "In Progress"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-gray-100 text-gray-800"
                              }`}
                          >
                            {rca.isRCAComplete || "Yet to Begin"}
                          </span>
                        </p>
                      </div>
                      <div className="flex justify-end gap-2 mt-4">
                        <button
                          onClick={() => handleEditRca(rca.rcaId)}
                          className="px-2 py-1 bg-amber-600 text-white rounded text-xs hover:bg-amber-700"
                          type="button"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleRemoveRca(rca.rcaId)}
                          className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                          type="button"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

        </div>
      )}

      {/* RCA Completion Modal */}
      <RCACompletionModal
        isOpen={showCompletionModal}
        onClose={() => setShowCompletionModal(false)}
        onSave={handleCompletionModalSave}
      />

    </div>

  );






}

RCASection.displayName = "RCASection";

export default forwardRef(RCASection);