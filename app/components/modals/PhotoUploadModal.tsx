// app/components/modals/PhotoUploadModal.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { uploadData } from 'aws-amplify/storage';
import { useUserAccess } from '@/app/hooks/useUserAccess';
import toast from 'react-hot-toast';

// Define the Photo interface
interface Photo {
  photoId: string;
  fileName: string;
  s3Key: string;
  thumbnailS3Key?: string;
  uploadedAt: string;
  uploadedBy: string;
  size: string;
  type: string;
}

interface PhotoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  submissionId: string;
  onSave: (photos: Photo[]) => void;
}

export default function PhotoUploadModal({ isOpen, onClose, submissionId, onSave }: PhotoUploadModalProps) {
  const { userAccess } = useUserAccess();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ✅ FIXED: Upload function with correct path structure
  const uploadFilexxx = async (file: File): Promise<Photo> => {
    try {
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name}`;
      
      // ✅ FIXED: Use the correct path structure that matches working examples
      // Pattern: recognition-photos/{recognitionId}/{timestamp}_{filename}
      const s3Key = `recognition-photos/${submissionId}/${fileName}`;
      const thumbnailS3Key = `recognition-photos/${submissionId}/thumb_${fileName}`;
      
      console.log('[PhotoUploadModal] Uploading to S3 paths:', {
        original: s3Key,
        thumbnail: thumbnailS3Key
      });

      // Upload original image
      const uploadResult = await uploadData({
        path: s3Key,
        data: file,
        options: {
          bucket: { bucketName: "simsstorage2.0", region: "us-east-1" },
          contentType: file.type,
        }
      }).result;

      console.log('[PhotoUploadModal] Original upload result:', uploadResult);

      // Create and upload thumbnail
      const thumbnailBlob = await createThumbnail(file);
      const thumbnailResult = await uploadData({
        path: thumbnailS3Key,
        data: thumbnailBlob,
        options: {
          bucket: { bucketName: "simsstorage2.0", region: "us-east-1" },
          contentType: 'image/jpeg',
        }
      }).result;

      console.log('[PhotoUploadModal] Thumbnail upload result:', thumbnailResult);

      return {
        photoId: `photo_${timestamp}`,
        fileName: file.name,
        s3Key: s3Key,           // ✅ This will be: recognition-photos/R-250625-21253490/1750901134464_image.jpg
        thumbnailS3Key: thumbnailS3Key,  // ✅ This will be: recognition-photos/R-250625-21253490/thumb_1750901134464_image.jpg
        uploadedAt: new Date().toISOString(),
        uploadedBy: userAccess?.email || 'Unknown',
        size: file.size.toString(),
        type: file.type
      };
    } catch (error) {
      console.error('[PhotoUploadModal] Upload failed:', error);
      throw error;
    }
  };

 
const uploadFile = async (file: File): Promise<Photo> => {
    try {
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name}`;
      
      // ✅ FIXED: Use the correct path structure that matches working examples
      // NO public/ prefix - just recognition-photos/
      const s3Key = `recognition-photos/${submissionId}/${fileName}`;
      const thumbnailS3Key = `recognition-photos/${submissionId}/thumb_${fileName}`;
      
      console.log('[PhotoUploadModal] Uploading to S3 paths:', {
        original: s3Key,
        thumbnail: thumbnailS3Key
      });
  
      // Upload original image
      const uploadResult = await uploadData({
        path: s3Key,
        data: file,
        options: {
          bucket: { bucketName: "simsstorage2.0", region: "us-east-1" },
          contentType: file.type,
        }
      }).result;
  
      // Create and upload thumbnail
      const thumbnailBlob = await createThumbnail(file);
      const thumbnailResult = await uploadData({
        path: thumbnailS3Key,
        data: thumbnailBlob,
        options: {
          bucket: { bucketName: "simsstorage2.0", region: "us-east-1" },
          contentType: 'image/jpeg',
        }
      }).result;
  
      return {
        photoId: `photo_${timestamp}`,
        fileName: file.name,
        s3Key: s3Key,           // ✅ This will be: recognition-photos/R-250625-21253490/1750901134464_image.jpg
        thumbnailS3Key: thumbnailS3Key,  // ✅ This will be: recognition-photos/R-250625-21253490/thumb_1750901134464_image.jpg
        uploadedAt: new Date().toISOString(),
        uploadedBy: userAccess?.email || 'Unknown',
        size: file.size.toString(),
        type: file.type
      };
    } catch (error) {
      console.error('[PhotoUploadModal] Upload failed:', error);
      throw error;
    }
  };
  
  

  // Create thumbnail function
  const createThumbnail = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Set thumbnail dimensions
        const maxWidth = 300;
        const maxHeight = 300;
        
        let { width, height } = img;
        
        // Calculate new dimensions maintaining aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create thumbnail'));
            }
          },
          'image/jpeg',
          0.8 // 80% quality
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileSelect = async (files: FileList) => {
    if (!files.length) return;

    setUploading(true);
    const newPhotos: Photo[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} is not a valid image file`);
          continue;
        }

        // Validate file size (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} is too large. Maximum size is 10MB`);
          continue;
        }

        try {
          const photo = await uploadFile(file);
          newPhotos.push(photo);
          toast.success(`${file.name} uploaded successfully`);
        } catch (error) {
          console.error(`Failed to upload ${file.name}:`, error);
          toast.error(`Failed to upload ${file.name}`);
        }
      }

      if (newPhotos.length > 0) {
        const updatedPhotos = [...photos, ...newPhotos];
        setPhotos(updatedPhotos);
        console.log('[PhotoUploadModal] All photos uploaded:', updatedPhotos);
      }
    } catch (error) {
      console.error('[PhotoUploadModal] Upload process failed:', error);
      toast.error('Upload process failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    handleFileSelect(files);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      handleFileSelect(files);
    }
  };

  const removePhoto = (photoId: string) => {
    setPhotos(prev => prev.filter(p => p.photoId !== photoId));
  };

  const handleSave = () => {
    console.log('[PhotoUploadModal] Saving photos:', photos);
    onSave(photos);
    onClose();
  };

  const handleSkip = () => {
    console.log('[PhotoUploadModal] Skipping photo upload');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900 bg-opacity-75 transition-opacity">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="text-center border-b border-gray-200 pb-4">
              <h2 className="text-xl font-semibold text-gray-800">Upload Photos</h2>
              <p className="text-gray-600 mt-2">Add photos to your recognition (optional)</p>
            </div>

            {/* Upload Area */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragOver 
                  ? 'border-blue-400 bg-blue-50' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDrop={handleDrop}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
            >
              <div className="space-y-4">
                <div className="text-4xl text-gray-400">📸</div>
                <div>
                  <p className="text-lg font-medium text-gray-700">
                    Drop photos here or click to browse
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Supports: JPG, PNG, GIF (Max 10MB each)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  disabled={uploading}
                >
                  {uploading ? 'Uploading...' : 'Select Photos'}
                </button>
              </div>
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileInputChange}
              className="hidden"
            />

            {/* Photo Preview */}
            {photos.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-medium text-gray-700">Uploaded Photos ({photos.length})</h3>
                <div className="grid grid-cols-2 gap-4">
                  {photos.map((photo) => (
                    <div key={photo.photoId} className="relative group">
                      <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                        <img
                          src={`/api/image-preview?key=${encodeURIComponent(photo.s3Key)}`}
                          alt={photo.fileName}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            console.error('Preview failed for:', photo.s3Key);
                            e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlPC90ZXh0Pjwvc3ZnPg==';
                          }}
                        />
                      </div>
                      <button
                        onClick={() => removePhoto(photo.photoId)}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                      <p className="text-xs text-gray-500 mt-1 truncate">{photo.fileName}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4 justify-end border-t border-gray-200 pt-4">
              <button
                onClick={handleSkip}
                className="px-6 py-2 border border-gray-300 text-gray-700 bg-white rounded hover:bg-gray-50 transition-colors"
                disabled={uploading}
              >
                Skip Photos
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                disabled={uploading}
              >
                {uploading ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Uploading...
                  </span>
                ) : (
                  `Save ${photos.length > 0 ? `(${photos.length} photos)` : ''}`
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
