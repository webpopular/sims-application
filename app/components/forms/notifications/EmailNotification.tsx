// app/components/notifications/EmailNotification.tsx
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { getAllNotificationUsers } from '@/lib/services/notificationUsersService';
import { getCurrentUser } from 'aws-amplify/auth';

interface User {
  email: string;
  name: string;
  roleTitle: string;
  level: string;
  isActive: boolean;
}

interface EmailNotificationProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  reportId: string;
  title?: string;
}

export default function EmailNotification({ 
  isOpen, 
  onClose, 
  onSuccess, 
  reportId, 
  title 
}: EmailNotificationProps) {
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [manualEmail, setManualEmail] = useState('');

  // ✅ Load ALL users from UserRole table when modal opens
  useEffect(() => {
    const loadAllUsers = async () => {
      if (!isOpen) return;
      
      try {
        setLoadingUsers(true);
        console.log('🔍 Loading all notification users...');
        
        // ✅ Get current user for context
        const currentUser = await getCurrentUser();
        const userEmail = currentUser?.signInDetails?.loginId;

        if (!userEmail) {
          throw new Error('No user logged in');
        }

        // ✅ ONLY CHANGE: Use client-side service instead of API
        const result = await getAllNotificationUsers();

        if (result.success && result.users) {
          const users = result.users.filter((user: any) => 
            user.email && 
            user.email.includes('@') && 
            user.isActive !== false
          );
          setAllUsers(users);
          setFilteredUsers(users);
          console.log(`✅ Loaded ${users.length} notification users`);
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

  // ✅ Add manual email functionality
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
      
      const emailContent = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2 style="color: #cb4154; margin-bottom: 20px;">
            Report Notification
          </h2>
          
          <p>Report ID: <span style="color: #cb4154; font-weight: bold;">${reportId}</span></p>
          <p>Title: <span style="font-weight: bold;">${title || 'N/A'}</span></p>
          
          ${notificationMessage ? `
            <div style="margin: 20px 0; padding: 15px; background-color: #f9f9f9; border-left: 4px solid #cb4154; border-radius: 4px;">
              <h3 style="margin-top: 0; color: #333;">Additional Information</h3>
              <p>${notificationMessage}</p>
            </div>
          ` : ''}
          
          <div style="margin-top: 20px; text-align: center;">
            <a href="${window.location.origin}/view/incidents" 
               style="background-color: #cb4154; 
                      color: white; 
                      padding: 12px 20px; 
                      text-decoration: none; 
                      border-radius: 4px; 
                      display: inline-block;
                      font-weight: bold;
                      font-size: 16px;">
              View Report
            </a>
          </div>
          
          <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #ddd;">
            <p style="color: #666666; font-size: 12px; margin: 0;">
              This is an automated notification from SIMS (Safety Information Management System).
            </p>
          </div>
        </div>
      `;
  
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipients: selectedRecipients,
          subject: `Report Notification - ${reportId}`,
          body: emailContent,
        }),
      });
  
      const data = await response.json();
  
      if (data.success) {
        console.log('✅ Email sent successfully');
        toast.success(`Notification sent to ${selectedRecipients.length} recipient(s) successfully!`);
        onSuccess();
      } else {
        console.error('❌ Failed to send email', data.error);
        toast.error(`Failed to send email: ${data.error || 'Unknown error occurred'}`);
      }
    } catch (error) {
      console.error('❌ Error sending email:', error);
      toast.error('Network error occurred. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Get user display name for selected recipients
  const getUserDisplayName = (email: string) => {
    const user = allUsers.find(u => u.email === email);
    return user ? `${user.name} (${user.email})` : email;
  };

  return isOpen ? (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900 bg-opacity-75 transition-opacity">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border-t-4 border-[#cb4154]">
          <div className="flex flex-col gap-6">
            {/* ✅ Header with maroon accent */}
            <div className="text-center border-b border-gray-200 pb-4">
              <h2 className="text-xl font-semibold text-[#8b1538]">Send Notification</h2>
              <p className="text-gray-600 mt-2">
                Search and select recipients to notify about this report.
              </p>
            </div>

            {/* ✅ User Selection Section with maroon theme */}
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
                  {/* ✅ Search Input with maroon focus */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search users by name, email, or role..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#cb4154] focus:border-[#cb4154] transition-colors"
                    />
                  </div>
                  
                  {/* ✅ Always visible dropdown with maroon theme */}
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
                              {/*<div className="text-xs text-gray-500">
                                {user.roleTitle} (Level {user.level})
                            </div>*/}
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

                  {/* ✅ Manual email input with maroon theme */}
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

            {/* ✅ Selected Recipients Display with maroon theme */}
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

            {/* ✅ Additional Message with maroon theme */}
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

            {/* ✅ Action Buttons with maroon theme */}
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
