// amplify/storage/resource.ts
import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
  name: 'simsStorage',
  isDefault: true, //  default bucket
  access: (allow) => ({
    'public/*': [
      allow.authenticated.to(['read', 'write', 'delete']),
      allow.groups(['admin','hr']).to(['read', 'write', 'delete']) // Add admin group permissions      
    ]
  })
});

// Add your safety alert bucket as an additional bucket
export const safetyAlertStorage = defineStorage({
  name: 'safetyAlertStorage',
  access: (allow) => ({
    'public/*': [
      allow.authenticated.to(['read', 'write', 'delete']),
      allow.groups(['admin','hr']).to(['read', 'write', 'delete']) // Add admin group permissions
    ],
    'public/safetyalertphotos/*': [
      allow.authenticated.to(['read', 'write', 'delete']),
      allow.groups([
        'admin',
        'hr',
        'SEGMENT', 
        'SEGMENT_SAFETY_DIRECTOR', 
        'PLATFORM_GROUP_PRESIDENT',
        'PLATFORM_HR', 
        'DIVISION_VP_GM_BUM', 
        'DIVISION_OPS_DIRECTOR',
        'DIVISION_HR_DIRECTOR', 
        'DIVISION_SAFETY', 
        'DIVISION_PLANT_MANAGER',
        'DIVISION_PLANT_HR', 
        'PLANT_SAFETY_MANAGER', 
        'PLANT_SAFETY_CHAMPIONS'
      ]).to(['read', 'write', 'delete']) // Add admin group permissions
    ],
    'public/safetyalertpdfs/*': [
      allow.authenticated.to(['read', 'write', 'delete']),
      allow.groups([
        'admin',
        'hr',
        'SEGMENT', 
        'SEGMENT_SAFETY_DIRECTOR', 
        'PLATFORM_GROUP_PRESIDENT',
        'PLATFORM_HR', 
        'DIVISION_VP_GM_BUM', 
        'DIVISION_OPS_DIRECTOR',
        'DIVISION_HR_DIRECTOR', 
        'DIVISION_SAFETY', 
        'DIVISION_PLANT_MANAGER',
        'DIVISION_PLANT_HR', 
        'PLANT_SAFETY_MANAGER', 
        'PLANT_SAFETY_CHAMPIONS'
      ]).to(['read', 'write', 'delete']) // Add admin group permissions
    ],
  }),
});
