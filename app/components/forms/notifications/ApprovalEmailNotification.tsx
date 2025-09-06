// app/components/forms/notifications/ApprovalEmailNotification.tsx - FIXED to match working EmailNotification exactly
'use client';

import React, { useState, useEffect } from 'react';
import { useUserAccess } from '@/app/hooks/useUserAccess';
import { getAllNotificationUsers, type NotificationUser as ServiceNotificationUser } from '@/lib/services/notificationUsersService';
import { sendEmailNotification } from '@/lib/services/emailNotificationService';
import { toast } from 'react-hot-toast';

interface ApprovalEmailNotificationProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  submissionId: string;
  title?: string;
  summary?: string;
  recordType?: 'INJURY_REPORT' | 'OBSERVATION_REPORT';
}

export default function ApprovalEmailNotification({
  isOpen,
  onClose,
  onSuccess,
  submissionId,
  title,
  summary,
  recordType = 'INJURY_REPORT'
}: ApprovalEmailNotificationProps) {
  const { userAccess } = useUserAccess();
  const [allUsers, setAllUsers] = useState<ServiceNotificationUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<ServiceNotificationUser[]>([]);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [manualEmail, setManualEmail] = useState('');

  // ✅ FIXED: Load users using existing service with RBAC filtering (same as working EmailNotification)
  useEffect(() => {
    const loadAllUsers = async () => {
      if (!isOpen) return;
      
      try {
        setLoadingUsers(true);
        console.log('🔍 Loading all users...');
        
        // ✅ Use existing getAllNotificationUsers service
        const result = await getAllNotificationUsers();

        if (result.success && result.users) {
          // ✅ RBAC filtering based on user's hierarchy (same as working EmailNotification)
          let availableUsers: ServiceNotificationUser[] = [];
          
          if (userAccess) {
            switch (userAccess.accessScope) {
              case 'ENTERPRISE':
                availableUsers = result.users;
                break;
                
              case 'SEGMENT':
                availableUsers = result.users.filter(user => 
                  parseInt(user.level) <= 2 ||
                  user.hierarchyString.startsWith(userAccess.hierarchyString)
                );
                break;
                
              case 'PLATFORM':
                availableUsers = result.users.filter(user => 
                  parseInt(user.level) <= 3 ||
                  user.hierarchyString.startsWith(userAccess.hierarchyString)
                );
                break;
                
              case 'DIVISION':
                availableUsers = result.users.filter(user => 
                  parseInt(user.level) <= 4 ||
                  user.hierarchyString.startsWith(userAccess.hierarchyString)
                );
                break;
                
              case 'PLANT':
                availableUsers = result.users.filter(user => 
                  parseInt(user.level) <= 4 ||
                  user.hierarchyString.startsWith(userAccess.hierarchyString.substring(0, userAccess.hierarchyString.lastIndexOf('>')))
                );
                break;
            }

            // Remove current user from the list
            availableUsers = availableUsers.filter(user => user.email !== userAccess.email);
          } else {
            availableUsers = result.users;
          }

          const users = availableUsers.filter((user: ServiceNotificationUser) => 
            user.email && 
            user.email.includes('@') && 
            user.isActive !== false
          );
          setAllUsers(users);
          setFilteredUsers(users);
          console.log(`✅ Loaded ${users.length} users`);
        } else {
          console.error('❌ Failed to load users:', result.error);
          toast.error('Failed to load users from database');
        }
      } catch (error) {
        console.error('❌ Error loading users:', error);
        toast.error('Error loading users. Please try again.');
      } finally {
        setLoadingUsers(false);
      }
    };

    loadAllUsers();
  }, [isOpen, userAccess]);

  // ✅ Filter users based on search term (same as working EmailNotification)
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

  const addRecipient = (email: string) => {
    if (!selectedRecipients.includes(email)) {
      setSelectedRecipients(prev => [...prev, email]);
      toast.success(`Added ${email} to recipients`);
    }
  };

  const removeRecipient = (email: string) => {
    setSelectedRecipients(prev => prev.filter(e => e !== email));
    toast.success(`Removed ${email} from recipients`);
  };

  // ✅ FIXED: Add manual email functionality (same as working EmailNotification)
  const addManualEmail = () => {
    const email = manualEmail.trim();
    if (email && email.includes('@') && !selectedRecipients.includes(email)) {
      setSelectedRecipients(prev => [...prev, email]);
      setManualEmail('');
      toast.success(`Added ${email} to recipients`);
    } else if (!email.includes('@')) {
      toast.error('Please enter a valid email address');
    }
  };

  const handleSendNotification = async () => {
    if (selectedRecipients.length === 0) {
      toast.error('Please select at least one recipient.');
      return;
    }

    try {
      setLoading(true);
      
      // ✅ Use existing email service (same as working EmailNotification)
      const result = await sendEmailNotification({
        recipients: selectedRecipients,
        subject: `${recordType === 'OBSERVATION_REPORT' ? 'Observation' : 'Incident'} Approval Required - ${submissionId}`,
        reportId: submissionId,
        title: title || `${recordType === 'OBSERVATION_REPORT' ? 'Observation' : 'Incident'} Approval Required`,
        additionalMessage: notificationMessage || summary,
        linkUrl: `${window.location.origin}/investigate-sections?mode=investigate-incidentclosure&id=${submissionId}`
      });

      if (result.success) {
        console.log('✅ Approval email sent successfully');
        toast.success(`Approval request sent to ${selectedRecipients.length} recipient(s) successfully!`);
        onSuccess();
      } else {
        console.error('❌ Failed to send approval email', result.error);
        toast.error(`Failed to send email: ${result.error || 'Unknown error occurred'}`);
      }
    } catch (error) {
      console.error('❌ Error sending approval email:', error);
      toast.error('Network error occurred. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Get user display name for selected recipients (same as working EmailNotification)
  const getUserDisplayName = (email: string) => {
    const user = allUsers.find(u => u.email === email);
    return user ? `${user.name} (${user.email})` : email;
  };
  
  return isOpen ? (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900 bg-opacity-75 transition-opacity">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border-t-4 border-[#cb4154]">
          <div className="flex flex-col gap-6">
            {/* ✅ Header with maroon accent (same as working EmailNotification) */}
            <div className="text-center border-b border-gray-200 pb-4">
              <h2 className="text-xl font-semibold text-[#8b1538]">Send For Approval</h2>
              <p className="text-gray-600 mt-2">
                Search and select recipients to notify about this {recordType === 'OBSERVATION_REPORT' ? 'observation' : 'incident'} approval request.
              </p>
            </div>

            {/* ✅ User Selection Section with maroon theme (same UI as working EmailNotification) */}
            <div className="w-full">
              <label className="block text-sm font-medium text-[#8b1538] mb-2">
                Select Recipients ({allUsers.length} users available)
              </label>
              
              {loadingUsers ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#cb4154] mx-auto"></div>
                  <p className="text-sm text-gray-600 mt-2">Loading users...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* ✅ Search Input with maroon focus (same as working EmailNotification) */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search users by name, email, or role..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#cb4154] focus:border-[#cb4154] transition-colors"
                    />
                  </div>
                  
                  {/* ✅ Always visible dropdown with maroon theme (same as working EmailNotification) */}
                  <div className="border border-gray-300 rounded-md max-h-60 overflow-y-auto bg-white">
                    <div className="px-3 py-2 bg-[#8b1538] text-white border-b text-xs font-medium sticky top-0">
                      {filteredUsers.length} user(s) {searchTerm ? `found for "${searchTerm}"` : 'available'}
                    </div>
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map((user, index) => (
                        <div
                          key={`${user.email}-${index}`}
                          className={`px-3 py-3 hover:bg-[#fdf2f8] cursor-pointer border-b border-gray-100 transition-colors ${
                            selectedRecipients.includes(user.email) ? 'bg-[#fce7f3] text-[#8b1538] border-l-4 border-l-[#cb4154]' : ''
                          }`}
                          onClick={() => addRecipient(user.email)}
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="font-medium text-sm">
                                {user.name} ({user.email})
                              </div>
                     
                            </div>
                            {selectedRecipients.includes(user.email) && (
                              <span className="text-[#cb4154] font-bold text-lg">✓</span>
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

                  {/* ✅ Manual email input with maroon theme (same as working EmailNotification) */}
                  <div className="flex gap-2">
                    <input
                      type="email"
                      placeholder="Or enter email address manually..."
                      value={manualEmail}
                      onChange={(e) => setManualEmail(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addManualEmail()}
                      className="flex-1 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#cb4154] focus:border-[#cb4154] transition-colors"
                    />
                    <button
                      onClick={addManualEmail}
                      className="px-4 py-2 bg-[#8b1538] text-white rounded-md hover:bg-[#6b1229] transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                      disabled={!manualEmail.trim()}
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ✅ Selected Recipients Display with maroon theme (same as working EmailNotification) */}
            {selectedRecipients.length > 0 && (
              <div className="w-full">
                <label className="block text-sm font-medium text-[#8b1538] mb-2">
                  Selected Recipients ({selectedRecipients.length})
                </label>
                <div className="max-h-32 overflow-y-auto border border-[#cb4154] rounded-md p-3 bg-[#fdf2f8]">
                  <div className="flex flex-wrap gap-2">
                    {selectedRecipients.map((email, index) => (
                      <div 
                        key={`selected-${email}-${index}`}
                        className="flex items-center gap-2 bg-[#cb4154] text-white px-3 py-1 rounded-full text-sm shadow-sm"
                      >
                        <span>{getUserDisplayName(email)}</span>
                        <button
                          type="button"
                          onClick={() => removeRecipient(email)}
                          className="inline-flex items-center justify-center w-4 h-4 rounded-full text-white hover:bg-[#8b1538] transition-colors duration-200"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ✅ Additional Message with maroon theme (same as working EmailNotification) */}
            <div className="w-full">
              <label className="block text-sm font-medium text-[#8b1538] mb-2">
                Additional Message (Optional)
              </label>
              <textarea
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#cb4154] focus:border-[#cb4154] transition-colors"
                rows={4}
                placeholder="Add any additional information you would like to send..."
                value={notificationMessage}
                onChange={(e) => setNotificationMessage(e.target.value)}
              />
            </div>

            {/* ✅ Action Buttons with maroon theme (same as working EmailNotification) */}
            <div className="flex gap-4 justify-end border-t border-gray-200 pt-4">
              <button
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 text-gray-700 bg-white rounded-md hover:bg-gray-50 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleSendNotification}
                className="px-6 py-2 bg-[#cb4154] text-white rounded-md hover:bg-[#8b1538] transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed shadow-sm"
                disabled={loading || selectedRecipients.length === 0}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Sending...
                  </span>
                ) : (
                  `Send to ${selectedRecipients.length} recipient(s)`
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  ) : null;
}
