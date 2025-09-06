// app/components/notifications/LessonsLearnedEmailNotification.tsx - FIXED to use service instead of API

import { useState, useEffect } from 'react';
import { useUserAccess } from '@/app/hooks/useUserAccess';
import { getAllNotificationUsers } from '@/lib/services/notificationUsersService';
import { getCurrentUser } from 'aws-amplify/auth';
import toast from 'react-hot-toast';

interface User {
  email: string;
  name: string;
  roleTitle: string;
  level: string;
  isActive: boolean;
}

interface LessonsLearnedEmailNotificationProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (selectedApprover: string, approverName: string) => void;
  lessonId: string;
  title?: string;
  lessonData: any;
}

export default function LessonsLearnedEmailNotification({ 
  isOpen, 
  onClose, 
  onSuccess, 
  lessonId, 
  title,
  lessonData
}: LessonsLearnedEmailNotificationProps) {
  const { userAccess } = useUserAccess();
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<string>('');
  const [selectedRecipientName, setSelectedRecipientName] = useState<string>('');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [manualEmail, setManualEmail] = useState('');

// ✅ ENHANCED: Load only lessons learned approvers using new permission
useEffect(() => {
  const loadLessonsLearnedApprovers = async () => {
    if (!isOpen) return;
    
    try {
      setLoadingUsers(true);
      console.log('📧 Loading lessons learned approvers with specific permission...');
      
      const result = await getAllNotificationUsers();

      if (result.success && result.users) {
        console.log(`🔍 Total users loaded: ${result.users.length}`);
        
        // Debug: Log all users and their permissions
        result.users.forEach(user => {
          console.log(`👤 User: ${user.name} (${user.email})`);
          console.log(`   Role: ${user.roleTitle}`);
          console.log(`   Permissions:`, user.permissions);
          console.log(`   canApproveLessonsLearned: ${user.permissions?.canApproveLessonsLearned}`);
        });

        // Filter by the new specific permission
        const lessonsLearnedApprovers = result.users.filter((user: any) => {
          const hasPermission = user.permissions?.canApproveLessonsLearned === true;
          console.log(`🔍 ${user.email}: hasPermission = ${hasPermission}`);
          return user.email && 
                 user.email.includes('@') && 
                 user.isActive !== false &&
                 hasPermission;
        });
        
        console.log(`✅ Filtered to ${lessonsLearnedApprovers.length} authorized approvers`);
        console.log('📋 Approved users:', lessonsLearnedApprovers.map(u => ({
          name: u.name,
          email: u.email,
          roleTitle: u.roleTitle
        })));
        
        setAllUsers(lessonsLearnedApprovers);
        setFilteredUsers(lessonsLearnedApprovers);
      }
    } catch (error) {
      console.error('❌ Error loading lessons learned approvers:', error);
      toast.error('Error loading approvers. Please try again.');
    } finally {
      setLoadingUsers(false);
    }
  };

  if (isOpen) {
    loadLessonsLearnedApprovers();
    setSelectedRecipient('');
    setSelectedRecipientName('');
    setSearchTerm('');
  }
}, [isOpen]);



  // ✅ Filter users based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredUsers(allUsers);
    } else {
      const filtered = allUsers.filter(user => 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.roleTitle.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [searchTerm, allUsers]);

  // ✅ Add manual email functionality
  const addManualEmail = () => {
    const email = manualEmail.trim();
    if (email && email.includes('@')) {
      setSelectedRecipient(email);
      setSelectedRecipientName(email);
      setManualEmail('');
      toast.success(`Selected ${email} as approver`);
    } else if (!email.includes('@')) {
      toast.error('Please enter a valid email address');
    }
  };

  // ✅ Clear selection function
  const clearSelection = () => {
    setSelectedRecipient('');
    setSelectedRecipientName('');
    setSearchTerm('');
  };

  const handleSendNotification = async () => {
    if (!selectedRecipient) {
      toast.error('Please select an approver first');
      return;
    }

    try {
      console.log(`📧 Sending lessons learned approval email to: ${selectedRecipient}`);
      
      const emailContent = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #2563eb; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">📚 LESSONS LEARNED APPROVAL REQUEST</h1>
        </div>
        
        <div style="padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <p><strong>Lesson ID:</strong> <span style="color: #2563eb; font-weight: bold;">${lessonId}</span></p>
            <p><strong>Title:</strong> <span style="font-weight: bold;">${title || 'Lessons Learned'}</span></p>
            <p><strong>Author:</strong> ${lessonData?.lessonsLearnedAuthor || 'Unknown'}</p>
            <p><strong>Segment:</strong> ${lessonData?.lessonsLearnedSegment || 'Not specified'}</p>
            <p><strong>Location:</strong> ${lessonData?.lessonsLearnedLocation || 'Not specified'}</p>
            
            ${lessonData?.lessonsLearnedKeyWords ? `
            <div style="margin: 15px 0; padding: 15px; background-color: #f0f8ff; border-left: 4px solid #2563eb;">
              <p><strong>Key Words:</strong></p>
              <p>${lessonData.lessonsLearnedKeyWords}</p>
            </div>
            ` : ''}
            
            <div style="margin: 15px 0; padding: 15px; background-color: #f0f8ff; border-left: 4px solid #2563eb;">
              <p><strong>Lesson Description:</strong></p>
              <p>${lessonData?.lessonDescription || 'No description provided.'}</p>
            </div>
            
            ${lessonData?.keyTakeaways ? `
            <div style="margin: 15px 0; padding: 15px; background-color: #f0f8ff; border-left: 4px solid #2563eb;">
              <p><strong>Key Takeaways:</strong></p>
              <p>${lessonData.keyTakeaways}</p>
            </div>
            ` : ''}
            
            ${notificationMessage ? `
            <div style="margin: 20px 0; padding: 15px; background-color: #fff3cd; border-left: 4px solid #ffc107;">
              <p><strong>Additional Information:</strong></p>
              <p>${notificationMessage.replace(/\n/g, '<br>')}</p>
            </div>
            ` : ''}
            
            <div style="margin-top: 30px; text-align: center;">
              <a href="${window.location.origin}/investigate/${lessonData?.submissionId || 'unknown'}?mode=investigate-lessonslearned&action=approve&lessonId=${lessonId}" 
                 style="background-color: #16a34a; 
                        color: white; 
                        padding: 15px 30px; 
                        text-decoration: none; 
                        border-radius: 6px; 
                        display: inline-block;
                        font-weight: bold;
                        font-size: 16px;
                        margin-right: 10px;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                ✅ Approve Lessons Learned
              </a>
              <a href="${window.location.origin}/investigate/${lessonData?.submissionId || 'unknown'}?mode=investigate-lessonslearned&lessonId=${lessonId}" 
                 style="background-color: #2563eb; 
                        color: white; 
                        padding: 15px 30px; 
                        text-decoration: none; 
                        border-radius: 6px; 
                        display: inline-block;
                        font-weight: bold;
                        font-size: 16px;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                📝 Review Lessons Learned
              </a>
              <p style="color: #666666; font-size: 12px; margin-top: 12px;">
                Click "Approve" to approve this lesson, or "Review" to view details and provide feedback.
              </p>
            </div>
          </div>
        </div>
        
        <div style="padding: 15px; text-align: center; background-color: #e9e9e9; color: #666666; font-size: 12px;">
          <p style="margin: 0;">
            This is an automated lessons learned approval request from SIMS (Safety Information Management System).
          </p>
          <p style="margin: 5px 0 0 0;">
            Sent by: ${userAccess?.name || userAccess?.email} (${userAccess?.roleTitle})
          </p>
        </div>
      </div>
    `;

      const response = await fetch('/api/send-lessons-learned-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipients: [selectedRecipient],
          subject: `📚 Lessons Learned Approval Request - ${title || 'Untitled'} - ID: ${lessonId}`,
          body: emailContent,
          lessonId: lessonId,
          submissionId: lessonData?.submissionId
        }),
      });

      const data = await response.json();

      if (data.success) {
        console.log('✅ Lessons learned email sent successfully');
        onSuccess(selectedRecipient, selectedRecipientName);
        onClose();
        toast.success('Lessons learned sent for approval successfully!');
      } else {
        console.error('❌ Failed to send lessons learned email', data.error);
        toast.error('Failed to send email: ' + data.error);
      }
    } catch (error) {
      console.error('❌ Error sending lessons learned email:', error);
      toast.error('Error sending email. Please try again.');
    }
  };

  // ✅ Get user display name for selected recipient
  const getUserDisplayName = (email: string) => {
    const user = allUsers.find(u => u.email === email);
    return user ? `${user.name} (${user.email})` : email;
  };

  return isOpen ? (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900 bg-opacity-75 transition-opacity">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border-t-4 border-blue-600">
          <div className="flex flex-col gap-6">
            {/* ✅ Header with blue accent */}
            <div className="text-center border-b border-gray-200 pb-4">
              <h2 className="text-xl font-semibold text-blue-800">Send Lessons Learned for Approval</h2>
              <p className="text-gray-600 mt-2">Search and select an approver for this lessons learned.</p>
            </div>

            {/* ✅ User Selection Section with blue theme */}
            <div className="w-full">
              <label className="block text-sm font-medium text-blue-800 mb-2">
                Select Approver ({allUsers.length} users available)
              </label>
              
              {loadingUsers ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-sm text-gray-600 mt-2">Loading users...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* ✅ Search Input with blue focus */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search users by name, email, or role..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors"
                    />
                  </div>
                  
                  {/* ✅ Always visible dropdown with blue theme */}
                  <div className="border border-gray-300 rounded-md max-h-60 overflow-y-auto bg-white">
                    <div className="px-3 py-2 bg-blue-800 text-white border-b text-xs font-medium sticky top-0">
                      {filteredUsers.length} user(s) {searchTerm ? `found for "${searchTerm}"` : 'available'}
                    </div>
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map((user, index) => (
                        <div
                          key={`${user.email}-${index}`}
                          className={`px-3 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 transition-colors ${
                            selectedRecipient === user.email ? 'bg-blue-100 text-blue-800 border-l-4 border-l-blue-600' : ''
                          }`}
                          onClick={() => {
                            setSelectedRecipient(user.email);
                            setSelectedRecipientName(user.name || user.email);
                            toast.success(`Selected ${user.name || user.email} as approver`);
                          }}
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="font-medium text-sm">
                                {user.name} ({user.email})
                              </div>
                              <div className="text-xs text-gray-500">
                                {user.roleTitle}
                              </div>
                            </div>
                            {selectedRecipient === user.email && (
                              <span className="text-blue-600 font-bold text-lg">✓</span>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="px-3 py-4 text-center text-gray-500">
                        {searchTerm ? `No users found matching "${searchTerm}"` : 'No users available'}
                      </div>
                    )}
                  </div>

                  {/* ✅ Manual email input with blue theme */}
                  <div className="flex gap-2">
                    <input
                      type="email"
                      placeholder="Or enter email address manually..."
                      value={manualEmail}
                      onChange={(e) => setManualEmail(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addManualEmail()}
                      className="flex-1 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors"
                    />
                    <button
                      onClick={addManualEmail}
                      className="px-4 py-2 bg-blue-800 text-white rounded-md hover:bg-blue-900 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                      disabled={!manualEmail.trim()}
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ✅ Selected Recipient Display with blue theme */}
            {selectedRecipient && (
              <div className="w-full">
                <label className="block text-sm font-medium text-blue-800 mb-2">
                  Selected Approver
                </label>
                <div className="border border-blue-600 rounded-md p-3 bg-blue-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 bg-blue-600 text-white px-3 py-1 rounded-full text-sm shadow-sm">
                      <span>{getUserDisplayName(selectedRecipient)}</span>
                    </div>
                    <button
                      onClick={clearSelection}
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ✅ Additional Message with blue theme */}
            <div className="w-full">
              <label className="block text-sm font-medium text-blue-800 mb-2">
                Additional Information (Optional)
              </label>
              <textarea
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors"
                rows={4}
                placeholder="Add any additional information about this lessons learned..."
                value={notificationMessage}
                onChange={(e) => setNotificationMessage(e.target.value)}
              />
            </div>

            {/* ✅ Action Buttons with blue theme */}
            <div className="flex gap-4 justify-end border-t border-gray-200 pt-4">
              <button
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 text-gray-700 bg-white rounded-md hover:bg-gray-50 transition-colors"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleSendNotification}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed shadow-sm"
                disabled={isLoading || !selectedRecipient}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Sending...
                  </span>
                ) : (
                  'Send for Approval'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  ) : null;
}
