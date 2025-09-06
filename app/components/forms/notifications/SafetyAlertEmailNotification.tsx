// app/components/notifications/SafetyAlertEmailNotification.tsx - FIXED type compatibility
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { getAllNotificationUsers } from '@/lib/services/notificationUsersService'; // ✅ Use existing service
import { getCurrentUser } from 'aws-amplify/auth';

interface User {
  email: string;
  name: string;
  roleTitle: string;
  level: string; // ✅ Keep as string to match existing interface
  isActive: boolean;
}

interface SafetyAlertEmailNotificationProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  alertId: string;
  alertTitle?: string; // ✅ FIXED: Add this missing prop
  alertType?: string;
  severity?: string;
  title?: string; // ✅ FIXED: Add this missing prop
  attachmentUrl?: string; // ✅ FIXED: Add this missing prop
} 


export default function SafetyAlertEmailNotification({ 
  isOpen, 
  onClose, 
  onSuccess, 
  alertId, 
  alertTitle,
  alertType,
  severity,
  title, // ✅ FIXED: Accept the title prop
  attachmentUrl // ✅ FIXED: Accept the attachmentUrl prop
}: SafetyAlertEmailNotificationProps) {
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [manualEmail, setManualEmail] = useState('');

  const displayTitle = title || alertTitle || 'Safety Alert';

  // ✅ FIXED: Load approval users using client-side service instead of API
  useEffect(() => {
    const loadApprovalUsers = async () => {
      if (!isOpen) return;
      
      try {
        setLoadingUsers(true);
        console.log('🔍 Loading approval users for safety alert...');
        
        // ✅ Use existing getAllNotificationUsers service (no parameters needed)
        const result = await getAllNotificationUsers();

        if (result.success && result.users) {
          // ✅ FIXED: Convert number level to string level to match User interface
          const users: User[] = result.users
            .filter((user: any) => 
              user.email && 
              user.email.includes('@') && 
              user.isActive !== false
            )
            .map((user: any) => ({
              email: user.email,
              name: user.name,
              roleTitle: user.roleTitle,
              level: user.level.toString(), // ✅ Convert number to string
              isActive: user.isActive
            }));

          setAllUsers(users);
          setFilteredUsers(users);
          console.log(`✅ Loaded ${users.length} approval users for safety alert`);
        } else {
          console.error('❌ Failed to load approval users:', result.error);
          toast.error('Failed to load approval users from database');
        }
      } catch (error) {
        console.error('❌ Error loading approval users:', error);
        toast.error('Error loading approval users. Please try again.');
      } finally {
        setLoadingUsers(false);
      }
    };

    loadApprovalUsers();
  }, [isOpen]);

  // ✅ Filter users based on search term (rest remains the same)
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
        <h2 style="color: #dc2626; margin-bottom: 20px;">🚨 Safety Alert Notification</h2>
        
        <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <p><strong>Alert ID:</strong> <span style="color: #dc2626; font-weight: bold;">${alertId}</span></p>
          <p><strong>Alert Title:</strong> <span style="font-weight: bold;">${alertTitle || 'Safety Alert'}</span></p>
          <p><strong>Alert Type:</strong> <span style="font-weight: bold;">${alertType || 'General'}</span></p>
          <p><strong>Severity:</strong> <span style="font-weight: bold; color: #dc2626;">${severity || 'High'}</span></p>
        </div>
        
        ${notificationMessage ? `
        <div style="margin: 20px 0; padding: 15px; background-color: #f9f9f9; border-radius: 4px;">
          <h3 style="margin-top: 0; color: #333;">Additional Information</h3>
          <p>${notificationMessage}</p>
        </div>
        ` : ''}
        
        <div style="margin-top: 20px; text-align: center;">
          <a href="${window.location.origin}/safety-alerts" 
             style="background-color: #dc2626; 
                    color: white; 
                    padding: 12px 20px; 
                    text-decoration: none; 
                    border-radius: 4px; 
                    display: inline-block;
                    font-weight: bold;
                    font-size: 16px;">
            View Safety Alert Details
          </a>
        </div>
        
        <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #ddd;">
          <p style="color: #666666; font-size: 12px; margin: 0;">
            This safety alert requires your immediate attention. Please review and take appropriate action.
          </p>
          <p style="color: #666666; font-size: 12px; margin: 5px 0 0 0;">
            This is an automated notification from SIMS (Safety Information Management System).
          </p>
        </div>
      </div>
      `;
    
      const response = await fetch('/api/send-safety-alert-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipients: selectedRecipients,
          subject: `🚨 Safety Alert: ${alertTitle || alertId}`,
          body: emailContent,
        }),
      });

      const data = await response.json();

      if (data.success) {
        console.log('✅ Safety alert email sent successfully');
        toast.success(`Safety alert notification sent to ${selectedRecipients.length} recipient(s) successfully!`);
        onSuccess();
      } else {
        console.error('❌ Failed to send safety alert email', data.error);
        toast.error(`Failed to send email: ${data.error || 'Unknown error occurred'}`);
      }
    } catch (error) {
      console.error('❌ Error sending safety alert email:', error);
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900 bg-opacity-75 transition-opacity">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border-t-4 border-red-600">
          <div className="flex flex-col gap-6">
            {/* ✅ Header with red accent for safety alerts */}
            <div className="text-center border-b border-gray-200 pb-4">
              <h2 className="text-xl font-semibold text-red-700">🚨 Send Safety Alert Notification</h2>
              <p className="text-gray-600 mt-2">
                Select approval users to notify about this safety alert.
              </p>
            </div>

            {/* ✅ Alert Information */}
            {/*<div className="bg-red-50 border border-red-200 rounded-md p-4">
              <h3 className="text-sm font-medium text-red-800 mb-2">Alert Details</h3>
              <div className="text-sm text-red-700 space-y-1">
                <div><strong>Alert ID:</strong> {alertId}</div>
                <div><strong>Title:</strong> {alertTitle || 'Safety Alert'}</div>
                <div><strong>Type:</strong> {alertType || 'General'}</div>
                <div><strong>Severity:</strong> {severity || 'High'}</div>
              </div>
            </div>*/}

            {/* ✅ User Selection Section */}
            <div className="w-full">
              <label className="block text-sm font-medium text-red-700 mb-2">
                Select Approval Users ({allUsers.length} users available)
              </label>
              
              {loadingUsers ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600 mx-auto"></div>
                  <p className="text-sm text-gray-600 mt-2">Loading approval users...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* ✅ Search Input */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search users by name, email, or role..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                    />
                  </div>
                  
                  {/* ✅ Manual Email Input */}
                  <div className="flex gap-2">
                    <input
                      type="email"
                      placeholder="Add email manually..."
                      value={manualEmail}
                      onChange={(e) => setManualEmail(e.target.value)}
                      className="flex-1 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      onKeyPress={(e) => e.key === 'Enter' && addManualEmail()}
                    />
                    <button
                      onClick={addManualEmail}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                    >
                      Add
                    </button>
                  </div>

                  {/* ✅ User List */}
                  <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-md">
                    {filteredUsers.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">
                        {searchTerm ? 'No users found matching your search.' : 'No approval users available.'}
                      </div>
                    ) : (
                      filteredUsers.map((user) => (
                        <div 
                          key={user.email} 
                          className="flex items-center justify-between p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                        >
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{user.name}</div>
                            <div className="text-sm text-gray-600">{user.email}</div>
                            <div className="text-sm text-gray-500">{user.roleTitle}</div>
                          </div>
                          <button
                            onClick={() => addRecipient(user.email)}
                            disabled={selectedRecipients.includes(user.email)}
                            className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                          >
                            {selectedRecipients.includes(user.email) ? 'Added' : 'Add'}
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ✅ Selected Recipients */}
            {selectedRecipients.length > 0 && (
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Selected Recipients ({selectedRecipients.length})
                </label>
                <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-md p-2 space-y-1">
                  {selectedRecipients.map((email) => (
                    <div key={email} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                      <span className="text-sm text-gray-700">{getUserDisplayName(email)}</span>
                      <button
                        onClick={() => removeRecipient(email)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ✅ Additional Message */}
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Message (Optional)
              </label>
              <textarea
                value={notificationMessage}
                onChange={(e) => setNotificationMessage(e.target.value)}
                rows={4}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                placeholder="Add any additional information about this safety alert..."
              />
            </div>

            {/* ✅ Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendNotification}
                disabled={loading || selectedRecipients.length === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <span>🚨</span>
                    <span>Send Safety Alert ({selectedRecipients.length})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
