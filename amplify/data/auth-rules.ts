// amplify/data/auth-rules.ts
import { defineAuth } from '@aws-amplify/backend';

//const env = process.env.NEXT_PUBLIC_ENVIRONMENT || 'DEV'; // Define environment variable

// Define authorization rules with environment context
export const authRules = {
  // Admin only access
  adminOnly: (allow: any) => [
    allow.group(`admin`).to(['create', 'read', 'update', 'delete']), // Environment-specific admin group
  ],

  // Supervisor and Owner access
  supervisorAndOwner: (allow: any) => [
    // Admin full access
    allow.group(`admin`).to(['create', 'read', 'update', 'delete']),
    // Supervisor access
    allow.group(`supervisor`).to(['read', 'update']), // Environment-specific supervisor group
    // Owner access
    allow.owner().to(['read', 'update']),
    // Guest access for QR submissions
    allow.guest().to(['create']),
  ],

  // Reference data access
  referenceData: (allow: any) => [
    allow.group(`admin`).to(['create', 'read', 'update', 'delete']),
    allow.guest().to(['read']),
  ],
};
