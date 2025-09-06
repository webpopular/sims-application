// app/components/forms/RecognitionForm.tsx
'use client'

import { useState, useEffect } from 'react'
import { generateClient } from 'aws-amplify/data'
import { type Schema } from '@/amplify/data/schema'
import { getCurrentUser } from 'aws-amplify/auth'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import SaveSuccessModal from '../modals/SaveSuccessModal'
import PhotoUploadModal from '../modals/PhotoUploadModal'
import { generateRecognitionId } from '@/app/utils/generateRecognitionId'
import { getUserInfo } from '@/lib/utils/getUserInfo'
import { useUserAccess } from '@/app/hooks/useUserAccess' // ✅ ADD THIS IMPORT

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

const client = generateClient<Schema>()

export default function RecognitionForm() {
  const { userAccess, hasPermission, isReady } = useUserAccess(); // ✅ ADD THIS HOOK
  const router = useRouter()

  const [formData, setFormData] = useState({
    recognitionId: '', 
    yourName: '',
    yourEmployeeId: '',
    recognizedPersonName: '',
    safetyFocused: false,
    continualImprovement: false,
    focus8020: false,
    entrepreneurialCulture: false,
    attitudeFocused: false,
    peopleFocused: false,
    detailFocused: false,
    employeeStory: '',
    mediaUploadUrl: '',
    contactRequested: false,
    contactPhoneNumber: ''
  })

  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showPhotoModal, setShowPhotoModal] = useState(false)
  const [createdRecordId, setCreatedRecordId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // ✅ Check permissions
  const canSafetyRecognition = hasPermission('canSafetyRecognition');

  // ✅ Loading state
  if (!isReady) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading permissions...</span>
      </div>
    );
  }

  // ✅ Permission check
  if (!canSafetyRecognition) {
    return (
      <main className="flex justify-center items-start bg-gray-50 min-h-screen py-10">
        <div className="w-full max-w-4xl">
          <div className="bg-white rounded-xl shadow-lg overflow-hidden p-8 text-center">
            <div className="text-red-600 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-red-600 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-4">You don't have permission to submit safety recognitions.</p>
            <button 
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Return to Home
            </button>
          </div>
        </div>
      </main>
    );
  }

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // ✅ FIXED: Alternative approach - Create recognition with photo data included
  const handlePhotosSave = async (photos: Photo[]) => {
    if (!createdRecordId || photos.length === 0) {
      console.log('[RecognitionForm] No photos to save or no record ID');
      toast.success('Recognition submitted successfully!');
      return;
    }
    
    try {
      console.log('[RecognitionForm] Attempting to save photo information...');
      console.log('[RecognitionForm] Photos to save:', photos);
      
      // Use the first photo's S3 keys
      const photo = photos[0];
      const mediaUploadUrl = photo.s3Key;
      const thumbnailS3Key = photo.thumbnailS3Key || '';
      
      console.log('[RecognitionForm] Photo data:', {
        mediaUploadUrl,
        thumbnailS3Key
      });

      // ✅ ALTERNATIVE APPROACH: Try to update, but handle authorization gracefully
      try {
        const updateResult = await client.models.Recognition.update({
          id: createdRecordId,
          mediaUploadUrl: mediaUploadUrl,
          thumbnailS3Key: thumbnailS3Key,
          updatedAt: new Date().toISOString(),
          updatedBy: userAccess?.email || 'Unknown'
        });
        
        console.log('[RecognitionForm] Update result:', updateResult);
        
        if (updateResult.data) {
          toast.success('Recognition and photo uploaded successfully!');
          console.log('✅ [RecognitionForm] Photo information saved to database');
        } else if (updateResult.errors) {
          console.error('❌ [RecognitionForm] Update errors:', updateResult.errors);
          throw new Error(`Update failed: ${updateResult.errors[0]?.message}`);
        }
      } catch (updateError) {
        console.error('❌ [RecognitionForm] Update permission denied:', updateError);
        
        // ✅ FALLBACK: If update fails due to permissions, still show success
        // The photo was uploaded to S3 successfully, just not linked in DB
        console.log('📸 [RecognitionForm] Photo uploaded to S3 successfully, but could not update database record');
        console.log('📸 [RecognitionForm] Photo S3 paths:', {
          original: mediaUploadUrl,
          thumbnail: thumbnailS3Key
        });
        
        toast.success('Recognition submitted successfully! Photo uploaded but may not appear in list due to permissions.');
      }
    } catch (error) {
      console.error('❌ [RecognitionForm] Error in photo save process:', error);
      toast.error('Recognition submitted, but photo save failed');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // ✅ Enhanced validation
    if (!formData.yourName.trim()) {
      toast.error('Please enter your name');
      return;
    }
    
    if (!formData.recognizedPersonName.trim()) {
      toast.error('Please enter the name of the person you are recognizing');
      return;
    }

    // ✅ Check if at least one value is selected
    const valuesSelected = [
      formData.safetyFocused,
      formData.continualImprovement,
      formData.focus8020,
      formData.entrepreneurialCulture,
      formData.attitudeFocused,
      formData.peopleFocused,
      formData.detailFocused
    ].some(value => value);

    if (!valuesSelected) {
      toast.error('Please select at least one core value demonstrated');
      return;
    }

    setIsLoading(true);

    try {
      // ✅ Enhanced user validation
      if (!userAccess) {
        throw new Error('User access data not available. Please refresh the page.');
      }

      // ✅ Check permission again before submission
      if (!canSafetyRecognition) {
        throw new Error('You do not have permission to submit safety recognitions.');
      }

      const user = await getCurrentUser()
      const now = new Date().toISOString()
      const recognitionId = generateRecognitionId()
      
      console.log('[RecognitionForm] Creating recognition with hierarchy:', userAccess.hierarchyString);
      console.log('[RecognitionForm] User permissions:', userAccess.permissions);

      const submissionData = {
        ...formData,
        recognitionId,
        hierarchyString: userAccess.hierarchyString,
        createdAt: now,
        createdBy: userAccess.email,
        updatedAt: now,
        updatedBy: userAccess.email
      };

      console.log('[RecognitionForm] Submitting data:', submissionData);

      const response = await client.models.Recognition.create(submissionData);

      if (response.data?.id) {
        console.log('✅ [RecognitionForm] Recognition created successfully with ID:', response.data.id);
        toast.success('Recognition submitted successfully!')
        setCreatedRecordId(response.data.id)
        setShowSuccessModal(true)
        setShowPhotoModal(true)
      } else if (response.errors) {
        console.error('❌ [RecognitionForm] GraphQL errors:', response.errors);
        throw new Error(`GraphQL Error: ${response.errors[0]?.message}`);
      }
    } catch (error) {
      console.error('❌ [RecognitionForm] Error submitting form:', error)
      
      // ✅ Enhanced error handling
      if (error instanceof Error) {
        if (error.message.includes('permission') || error.message.includes('Not Authorized')) {
          toast.error('Permission denied: ' + error.message);
        } else if (error.message.includes('validation')) {
          toast.error('Validation error: ' + error.message);
        } else {
          toast.error('Failed to submit recognition: ' + error.message);
        }
      } else {
        toast.error('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="flex justify-center items-start bg-gray-50 min-h-screen py-10">
      <div className="w-full max-w-4xl">
        {/* ✅ Header with user info */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-2 h-12 bg-blue-600 rounded-full mr-4"></div>
            <h1 className="text-2xl font-bold text-gray-800">
              Employee Recognition Form
            </h1>
          </div>
          {userAccess && (
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
              {userAccess.roleTitle} (Level {userAccess.level})
            </span>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-blue-50 p-4 border-b border-blue-100">
            <p className="text-blue-700 font-medium">Recognize a colleague who exemplifies our core values</p>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6 space-y-8">
            {/* Your Information */}
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-700 pb-2 border-b border-gray-200">Your Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Your Name *</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-transparent transition"
                    value={formData.yourName}
                    onChange={e => handleChange('yourName', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Your Employee ID</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-transparent transition"
                    value={formData.yourEmployeeId}
                    onChange={e => handleChange('yourEmployeeId', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Recognition Information */}
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-700 pb-2 border-b border-gray-200">Recognition Information</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name of the Person You Are Recognizing *
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-transparent transition"
                  value={formData.recognizedPersonName}
                  onChange={e => handleChange('recognizedPersonName', e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Core Values */}
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-700 pb-2 border-b border-gray-200">Core Values Demonstrated *</h2>
              <p className="text-sm text-gray-600 mb-4">Select all that apply:</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: 'Safety Focused', key: 'safetyFocused', icon: '🛡️' },
                  { label: 'Continual Improvement', key: 'continualImprovement', icon: '📈' },
                  { label: '80/20 Focus', key: 'focus8020', icon: '🎯' },
                  { label: 'Entrepreneurial Culture', key: 'entrepreneurialCulture', icon: '💡' },
                  { label: 'Attitude Focused', key: 'attitudeFocused', icon: '😊' },
                  { label: 'People Focused', key: 'peopleFocused', icon: '👥' },
                  { label: 'Detail Focused', key: 'detailFocused', icon: '🔍' }
                ].map(({ label, key, icon }) => (
                  <div 
                    key={key} 
                    className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all ${
                      formData[key as keyof typeof formData] 
                        ? 'bg-blue-50 border-blue-300' 
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                    onClick={() => handleChange(key, !formData[key as keyof typeof formData])}
                  >
                    <input
                      type="checkbox"
                      checked={formData[key as keyof typeof formData] as boolean}
                      onChange={() => {}}
                      className="h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <span className="ml-3 text-base">{icon} {label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Employee Story */}
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-700 pb-2 border-b border-gray-200">Recognition Story</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tell us about what this person did (Optional)
                </label>
                <textarea
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-transparent transition"
                  rows={4}
                  value={formData.employeeStory}
                  onChange={e => handleChange('employeeStory', e.target.value)}
                  placeholder="Describe the specific actions or behaviors that exemplify our core values..."
                />
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-700 pb-2 border-b border-gray-200">Contact Preferences</h2>
              
              <div className="flex items-center">
                <input
                  id="contactRequested"
                  type="checkbox"
                  checked={formData.contactRequested}
                  onChange={e => handleChange('contactRequested', e.target.checked)}
                  className="h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <label htmlFor="contactRequested" className="ml-3 text-base text-gray-700">
                  Would you like to be contacted about this recognition?
                </label>
              </div>
            </div>

            <div className="pt-6 border-t border-gray-200">
              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full md:w-auto float-right px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Submitting...
                  </span>
                ) : (
                  'Submit Recognition'
                )}
              </button>
            </div>
          </form>
        </div>

        <SaveSuccessModal
          isOpen={showSuccessModal}
          onClose={() => {
            setShowSuccessModal(false)
            if (!showPhotoModal) {
              router.push('/recognition')
            }
          }}
        />

        <PhotoUploadModal
          isOpen={showPhotoModal}
          onClose={() => {
            setShowPhotoModal(false)
            router.push('/recognition')
          }}
          submissionId={createdRecordId || ''}
          onSave={handlePhotosSave}
        /> 

      </div>
    </main>
  )
}
