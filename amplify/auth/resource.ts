// // amplify/auth/resource.ts
// import { defineAuth } from '@aws-amplify/backend';
//
// export const auth = defineAuth({
//   loginWith: {
//     email: true
//   },
//   userAttributes: {
//     email: {
//       required: true,
//       mutable: true
//     },
//     'custom:role': {
//       dataType: 'String',
//       mutable: true
//     },
//     'custom:level': {
//       dataType: 'String',
//       mutable: true
//     },
//     'custom:division': {
//       dataType: 'String',
//       mutable: true
//     },
//     'custom:plantAccess': {
//       dataType: 'String',
//       mutable: true
//     }
//   },
//   groups: [
//     'admin',
//     'ENTERPRISE',
//     'SEGMENT',
//     'PLATFORM',  //  some roles map to general platform
//     'REGIONAL',
//     'PLATFORM_GROUP_PRESIDENT',
//     'PLATFORM_HR',
//     'DIVISION_HR_DIRECTOR',
//     'DIVISION_VP_GM_BUM',
//     'DIVISION_OPS_DIRECTOR',
//     'DIVISION_PLANT_MANAGER',
//     'DIVISION_PLANT_HR',
//     'DIVISION_SAFETY',
//     'ENTERPRISE_SAFETY_DIRECTOR',  // For ITW Safety Director
//     'SEGMENT_SAFETY_DIRECTOR',     // For Segment Safety Director
//     'PLANT_SAFETY_MANAGER',        // For Plant Safety Manager
//     'PLANT_SAFETY_CHAMPIONS',      // For Plant Safety Champions
//     'hr'
//   ]
// });
