// app/components/sections/Documents.tsx

'use client';

import { ChevronDown, ChevronRight } from "lucide-react";
import { forwardRef, useState, useRef, useEffect } from "react";
import type { Document } from "@/app/types";
import { v4 as uuidv4 } from "uuid";
import { useRouter } from 'next/navigation';
import { getUserInfo } from '@/lib/utils/getUserInfo';
import { copy, remove, getUrl, uploadData } from 'aws-amplify/storage';
import { Download, X } from 'lucide-react';
import { fetchAuthSession } from 'aws-amplify/auth';
import toast from "react-hot-toast";
 


interface DocumentsSectionProps {
  isExpanded: boolean;
  onToggle: () => void;
  onSave: (sectionName: string, documents: Document[]) => void;
  submissionId: string;
  existingDocuments?: Document[];
}

const DocumentsSection = forwardRef<HTMLDivElement, DocumentsSectionProps>(
  ({ isExpanded, onToggle, onSave, submissionId, existingDocuments = [] }, ref) => {

    const [userGroups, setUserGroups] = useState<string[]>([]);
    const [isHRUser, setIsHRUser] = useState<boolean>(false);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [totalDocCount, setTotalDocCount] = useState(0);
    const [visibleDocCount, setVisibleDocCount] = useState(0);
    const [showPIIModal, setShowPIIModal] = useState(false);



    const [deleteConfirmation, setDeleteConfirmation] = useState<{
      show: boolean;
      docToDelete: Document | null;
      fileName: string;
    }>({
      show: false,
      docToDelete: null,
      fileName: '',
    });

    const router = useRouter();

    useEffect(() => {
      async function checkUserGroups() {
        try {
          const userInfo = await getUserInfo();
          console.log('✅ User groups:', userInfo.groups);

          const groups = Array.isArray(userInfo.groups) ? userInfo.groups : [];
          const isHR = groups.includes('hr');

          setIsHRUser(isHR);
          setUserGroups(groups);
        } catch (error) {
          console.error('Error checking user groups:', error);
          setIsHRUser(false);
          setUserGroups([]);
        }
      }

      checkUserGroups();
    }, []);

    useEffect(() => {
      // This effect ensures that the documents state is updated when existingDocuments changes
      if (existingDocuments && existingDocuments.length > 0) {
        console.log('Updating documents from existingDocuments:', existingDocuments);
        const initializedDocs = existingDocuments.map(doc => ({
          ...doc,
          hasPII: doc.hasPII ?? (doc.s3Key.includes('/pii/'))
        }));
        setDocuments(initializedDocs);
      }
    }, [existingDocuments]);

    useEffect(() => {
      console.log('Current documents state:', documents);

      // Check for duplicates
      const s3Keys = documents.map(doc => doc.s3Key);
      const uniqueKeys = new Set(s3Keys);
      if (s3Keys.length !== uniqueKeys.size) {
        console.warn('Duplicate S3 keys detected in documents state:',
          s3Keys.filter((key, index) => s3Keys.indexOf(key) !== index));
      }

      // Check for inconsistent PII flags
      const inconsistentDocs = documents.filter(doc =>
        (doc.hasPII && !doc.s3Key.includes('/pii/')) ||
        (!doc.hasPII && doc.s3Key.includes('/pii/'))
      );

      if (inconsistentDocs.length > 0) {
        console.warn('Inconsistent PII flags detected:', inconsistentDocs);
      }
    }, [documents]);

    useEffect(() => {
      // Calculate total documents
      const total = documents.length;
      setTotalDocCount(total);

      // Calculate visible documents
      const visible = documents.filter(doc => isHRUser || !doc.hasPII).length;
      setVisibleDocCount(visible);

      console.log('Document counts updated:', { total, visible });
    }, [documents, isHRUser]);




    useEffect(() => {
      console.log('Document state changed:', {
        documents: documents.length,
        existingDocuments: existingDocuments?.length || 0,
        isHRUser,
        visibleCount: documents.filter(doc => isHRUser || !doc.hasPII).length,
        totalCount: existingDocuments?.length || 0
      });
    }, [documents, existingDocuments, isHRUser]);



    const totalDocuments = existingDocuments?.length || 0;
    const visibleDocuments = documents.filter(doc => isHRUser || !doc.hasPII).length;


// app/components/sections/Documents.tsx - Enhanced error handling
const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  if (!e.target.files?.length) return;

  setUploading(true);
  setError(null);

  try {
    const file = e.target.files[0];
    const uniqueId = uuidv4();

    // ✅ FIXED: Better session handling
    let session;
    try {
      session = await fetchAuthSession({ forceRefresh: false });
    } catch (sessionError) {
      console.error('Session error, trying to refresh:', sessionError);
      session = await fetchAuthSession({ forceRefresh: true });
    }

    const identityId = session.identityId;
    
    if (!identityId) {
      throw new Error('Unable to get user identity. Please log in again.');
    }

    // ✅ FIXED: Consistent path structure
    const fileName = `${submissionId}/general/${Date.now()}-${uniqueId}-${file.name}`;
    const s3Path = `public/${identityId}/${fileName}`;

    const userInfo = await getUserInfo();
    const uploadedBy = userInfo.email || userInfo.username || 'Unknown';

    console.log('[Documents] Uploading file:', {
      fileName: file.name,
      s3Path,
      uploadedBy,
      fileSize: file.size
    });

    // ✅ FIXED: Enhanced upload with better error handling
    const uploadResult = await uploadData({
      path: s3Path,
      data: file,
      options: {
        bucket: { bucketName: "simsstorage2.0", region: "us-east-1" },
        contentType: file.type,
        onProgress: ({ transferredBytes, totalBytes }) => {
          if (totalBytes) {
            const progress = Math.round((transferredBytes / totalBytes) * 100);
            console.log(`Upload progress: ${progress}%`);
          }
        }
      }
    }).result;

    console.log('[Documents] Upload successful:', uploadResult);

    const newDoc: Document = {
      docId: uniqueId,
      fileName: file.name,
      s3Key: s3Path,
      uploadedAt: new Date().toISOString(),
      uploadedBy,
      size: file.size,
      type: file.type,
      hasPII: false // Default to false, can be updated later
    };

    // ✅ FIXED: Better duplicate checking
    const isDuplicate = documents.some(doc => 
      doc.fileName === newDoc.fileName && 
      doc.s3Key === newDoc.s3Key
    );

    if (isDuplicate) {
      console.warn('[Documents] Duplicate document detected, skipping add');
      toast.error('This document has already been uploaded.');
      return;
    }

    const updatedDocs = [...documents, newDoc];
    setDocuments(updatedDocs);

    // ✅ FIXED: Save immediately after upload
    await onSave('documents', updatedDocs);

    console.log('[Documents] Document added successfully:', newDoc);
    toast.success(`Document "${file.name}" uploaded successfully!`);

  } catch (error) {
    console.error('[Documents] Upload failed:', error);
    
    // ✅ Enhanced error handling
    if (error instanceof Error) {
      if (error.message.includes('Access Denied') || error.message.includes('Unauthorized')) {
        setError('You do not have permission to upload documents to this submission.');
        toast.error('Upload permission denied. Please contact your administrator.');
      } else if (error.message.includes('Network')) {
        setError('Network error during upload. Please check your connection.');
        toast.error('Network error. Please try again.');
      } else if (error.message.includes('File too large')) {
        setError('File is too large. Please choose a smaller file.');
        toast.error('File size exceeds limit.');
      } else {
        setError(`Upload failed: ${error.message}`);
        toast.error(`Upload failed: ${error.message}`);
      }
    } else {
      setError('Upload failed. Please try again.');
      toast.error('Upload failed. Please try again.');
    }
  } finally {
    setUploading(false);
    // ✅ Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }
};



    const handlePIIToggle = async (e: React.ChangeEvent<HTMLInputElement>, doc: Document, index: number) => {
      setShowPIIModal(true);
    
      const isPII = e.target.checked;
    
      // Optimistically update UI for responsiveness
      setDocuments(prevDocuments => {
        const docIndex = prevDocuments.findIndex(d => d.docId === doc.docId);
        if (docIndex === -1) return prevDocuments;
    
        const updatedDocuments = [...prevDocuments];
        updatedDocuments[docIndex] = {
          ...prevDocuments[docIndex],
          hasPII: isPII,
        };
    
        return updatedDocuments;
      });
    
      try {
        // Normalize the source path
        let sourcePath = doc.s3Key;
        if (!sourcePath.startsWith('public/')) {
          sourcePath = `public/${sourcePath}`;
        }
    
        // Create the destination path
        const pathParts = sourcePath.split('/');
        const folderIndex = pathParts.findIndex(part => part === 'general' || part === 'pii');
    
        if (folderIndex === -1) {
          throw new Error('Invalid path structure: neither "general" nor "pii" folder found');
        }
    
        pathParts[folderIndex] = isPII ? 'pii' : 'general';
        const destinationPath = pathParts.join('/');
    
        console.log('Moving file from:', sourcePath, 'to:', destinationPath);
    
        // Copy the file to the new location
        const copyResult = await copy({
          source: {
            path: sourcePath,
            bucket: {
              bucketName: "simsstorage2.0",
              region: "us-east-1"
            }
          },
          destination: {
            path: destinationPath,
            bucket: {
              bucketName: "simsstorage2.0",
              region: "us-east-1"
            }
          }
        });
    
        console.log('Copy result:', copyResult);
    
        // After successful copy, remove the original file
        const removeResult = await remove({
          path: sourcePath,
          options: {
            bucket: { bucketName: "simsstorage2.0", region: "us-east-1" }
          }
        });
    
        console.log('Remove result:', removeResult);
    
        // --- Update state and call onSave OUTSIDE the updater ---
        // Build the updated documents array
        const updatedDocs = documents.map((d) =>
          d.docId === doc.docId
            ? { ...d, s3Key: destinationPath, hasPII: isPII }
            : d
        );
    
        setDocuments(updatedDocs); // Update local state
        onSave("documents", updatedDocs); // Update parent/DB
    
      } catch (error) {
        console.error("Failed to move document:", error);
        alert(`Failed to move document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
        // Revert the UI state in case of error
        setDocuments(prevDocuments => {
          const docIndex = prevDocuments.findIndex(d => d.docId === doc.docId);
          if (docIndex === -1) return prevDocuments;
    
          const revertedDocuments = [...prevDocuments];
          revertedDocuments[docIndex] = {
            ...prevDocuments[docIndex],
            hasPII: !isPII, // Revert to original PII state
          };
    
          return revertedDocuments;
        });
      }
    };
    

    const handleDownload = async (doc: Document) => {
      try {
        let filePath = doc.s3Key;
        if (filePath.startsWith('public/')) {
          filePath = filePath.substring(7); // Remove 'public/' prefix if present
        }

        const { url } = await getUrl({
          key: filePath,
          options: {
            bucket: { bucketName: "simsstorage2.0", region: "us-east-1" },
            validateObjectExistence: true,
          },
        });

        window.open(url, '_blank');
      } catch (error) {
        console.error("Download failed:", error);
        setError("Failed to download file. Please try again.");
      }
    };


    const handleDelete = (doc: Document) => {
      setDeleteConfirmation({ show: true, docToDelete: doc, fileName: doc.fileName });
    };

    const confirmDelete = async (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      if (!deleteConfirmation.docToDelete) return;

      try {
        let filePath = deleteConfirmation.docToDelete.s3Key;
        if (filePath.startsWith('public/')) {
          filePath = filePath.substring(7); // Remove 'public/' prefix if present
        }

        await remove({
          key: filePath,
          options: {
            bucket: { bucketName: "simsstorage2.0", region: "us-east-1" }
          }
        });

        const updatedDocs = documents.filter(d => d.s3Key !== deleteConfirmation.docToDelete?.s3Key);
        setDocuments(updatedDocs);
        onSave("documents", updatedDocs);
        setError(null);
      } catch (error) {
        console.error("Delete failed:", error);
        setError("Failed to delete file. Please try again.");
      } finally {
        setDeleteConfirmation({ show: false, docToDelete: null, fileName: '' });
      }
    };


    return (
      <div ref={ref} className="border-b relative">

        {showPIIModal && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div className="bg-white rounded-md shadow-lg p-6 w-full max-w-xs text-center">
              <h3 className="text-md font-semibold text-gray-800 mb-4">Note</h3>
              <p className="text-sm text-gray-700 mb-6">Document has been marked as PII.</p>
              <button
                onClick={() => setShowPIIModal(false)}
                className="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition"
              >
                OK
              </button>
            </div>
          </div>
        )}



        {deleteConfirmation.show && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Confirm Deletion</h3>
              <p className="text-sm text-gray-600 mb-6">
                Are you sure you want to delete <strong>{deleteConfirmation.fileName}</strong>?
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setDeleteConfirmation({ show: false, docToDelete: null, fileName: '' })}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={onToggle}
          className={`w-full flex justify-between items-center px-4 py-3 text-sm font-medium transition-all duration-200 border-b border-gray-200 last:border-b-0
        ${isExpanded ? "bg-red-50" : "bg-white"}
           hover:bg-red-200 hover:text-sm rounded-md relative group`}
        >
          <div className="flex items-center">
            {isExpanded ? <ChevronDown className="h-5 w-5 mr-2" /> : <ChevronRight className="h-5 w-5 mr-2" />}
            <span className="flex items-center gap-2">
              Documents ({visibleDocCount})
              <span className="text-xs text-gray-500">
                (Total: {totalDocCount}, Showing: {visibleDocCount})
              </span>
            </span>
          </div>
        </button>



        {isExpanded && (
          <div className="p-4 bg-white shadow-sm rounded-b-md">
            {error && <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">{error}</div>}

            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              disabled={uploading}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
            />

            {uploading && <div className="text-sm text-gray-500">Uploading...</div>}

            <div className="space-y-2 mt-4">
              {documents
                .filter(doc => isHRUser || !doc.hasPII)
                .map((doc, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded shadow-sm transition-all duration-500 ease-in-out mb-2"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-1 sm:space-y-0">
                      <span className="text-sm">{doc.fileName}</span>
                      <span className="text-xs text-gray-500">{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                      <span className="text-xs text-gray-500">{(doc.size / 1024).toFixed(2)} KB</span>
                      <span className="text-xs text-gray-500">Uploaded by: {doc.uploadedBy}</span>

                      <label className="flex items-center space-x-2 text-xs text-gray-600">
                        <input
                          type="checkbox"
                          checked={doc.hasPII}
                          onChange={(e) => handlePIIToggle(e, doc, index)}
                          className="form-checkbox h-4 w-4 text-red-600"
                        />
                        <span>Mark as PII</span>
                      </label>
                    </div>

                    <div className="flex items-center space-x-2">

                      <button
                        onClick={(e) => { e.preventDefault(); handleDownload(doc); }}
                        className="inline-flex items-center px-3 py-1 border border-blue-500 text-blue-600 text-xs font-medium rounded-md shadow-sm hover:bg-blue-50 hover:text-blue-700 hover:scale-105 transition transform duration-200"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Download
                      </button>
                      <button
                        onClick={(e) => { e.preventDefault(); handleDelete(doc); }}
                        className="inline-flex items-center px-3 py-1 border border-red-500 text-red-600 text-xs font-medium rounded-md shadow-sm hover:bg-red-50 hover:text-red-700 hover:scale-105 transition transform duration-200"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Delete
                      </button>




                    </div>
                  </div>
                ))}

              {visibleDocuments === 0 && (
                <div className="text-sm text-gray-500 text-center py-4">
                  No documents to display.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
);

DocumentsSection.displayName = "DocumentsSection";

export default DocumentsSection;
