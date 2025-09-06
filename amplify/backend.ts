// amplify/backend.ts
import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { storage, safetyAlertStorage } from './storage/resource';
import { Effect, Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { CfnBucket } from 'aws-cdk-lib/aws-s3';

const backend = defineBackend({
  auth,
  data,
  storage,
  safetyAlertStorage
});

// Output for reference (optional)
backend.addOutput({
  custom: {
    safetyAlertBucketName: 'safetyAlertStorage'
  }
});

// ====== Custom S3 bucket permissions for authenticated users ======

// Create a custom stack for the bucket (required for CDK)
const customBucketStack = backend.createStack("custom-bucket-stack");

// Import the existing custom bucket
const customBucket = Bucket.fromBucketName(
  customBucketStack,
  "CustomStorage",
  "simsstorage2.0"
);

// ✅ Complete Functional Permission Groups Based on Your Excel RolePermission Data
const functionalPermissionGroups = {
  // ✅ Groups that can perform incident closure approvals (from "Can perform an Approval for Incident Closure" column)
  incidentClosureApprovers: [
    'admin',
    'hr',
    'ENTERPRISE_SAFETY_DIRECTOR',    // ITW Safety Director - X
    'SEGMENT_SAFETY_DIRECTOR',       // Segment Safety Director - X  
    'DIVISION_OPS_DIRECTOR',         // Operations Director - X
    'DIVISION_PLANT_MANAGER'         // Plant Manager - X
  ],
  
  // ✅ Groups that can take first report actions (from "Can Take First Report Actions" column)
  firstReportActionTakers: [
    'admin',
    'hr',
    'ENTERPRISE_SAFETY_DIRECTOR',    // ITW Safety Director - X
    'SEGMENT_SAFETY_DIRECTOR',       // Segment Safety Director - X
    'DIVISION_VP_GM_BUM',           // VP/GM/BUM - X
    'DIVISION_OPS_DIRECTOR',        // Operations Director - X
    'DIVISION_HR_DIRECTOR',         // Divisional HR Director - X
    'DIVISION_SAFETY',              // Divisional Safety Manager - X
    'PLANT_SAFETY_MANAGER',         // Plant Safety Manager - X
    'DIVISION_PLANT_MANAGER'        // Plant Manager - X
  ],
  
  // ✅ Groups that can take RCA actions (from "Can Take Incident with RCA Actions" column)
  rcaActionTakers: [
    'admin',
    'hr',
    'ENTERPRISE_SAFETY_DIRECTOR',    // ITW Safety Director - X
    'SEGMENT_SAFETY_DIRECTOR',       // Segment Safety Director - X
    'DIVISION_HR_DIRECTOR',         // Divisional HR Director - X
    'DIVISION_SAFETY',              // Divisional Safety Manager - X
    'PLANT_SAFETY_MANAGER',         // Plant Safety Manager - X
    'DIVISION_OPS_DIRECTOR',
    'DIVISION_PLANT_MANAGER',       // Plant Manager - X
    'DIVISION_PLANT_HR'             // Plant HR Manager - X
  ],
  
  // ✅ Groups that can take quick fix actions (from "Can Take Quick Fix Actions" column)
  quickFixActionTakers: [
    'admin',
    'hr',
    'ENTERPRISE_SAFETY_DIRECTOR',    // ITW Safety Director - X
    'SEGMENT_SAFETY_DIRECTOR',       // Segment Safety Director - X
    'PLATFORM_HR',                  // Platform HR Director - X
    'DIVISION_HR_DIRECTOR',         // Divisional HR Director - X
    'DIVISION_SAFETY',              // Divisional Safety Manager - X
    'PLANT_SAFETY_MANAGER',         // Plant Safety Manager - X
    'PLANT_SAFETY_CHAMPIONS',       // Plant Safety Champions - X
    'DIVISION_OPS_DIRECTOR',
    'DIVISION_PLANT_MANAGER',       // Plant Manager - X
    'DIVISION_PLANT_HR'             // Plant HR Manager - X
  ],
  
  // ✅ Groups that can view/manage OSHA logs (from "Can View/Manage OSHA Logs" column)
  oshaLogManagers: [
    'admin',
    'hr',
    'ENTERPRISE_SAFETY_DIRECTOR',    // ITW Safety Director - X
    'SEGMENT_SAFETY_DIRECTOR',       // Segment Safety Director - X
    'DIVISION_HR_DIRECTOR',         // Divisional HR Director - X
    'DIVISION_SAFETY',              // Divisional Safety Manager - X
    'DIVISION_OPS_DIRECTOR',
    'PLANT_SAFETY_MANAGER',         // Plant Safety Manager - X
    'DIVISION_PLANT_MANAGER',       // Plant Manager - X
    'DIVISION_PLANT_HR'             // Plant HR Manager - X
  ],
  
  // ✅ Groups that can view dashboard (from "View Dashboard" column)
  dashboardViewers: [
    'admin',
    'hr',
    'ENTERPRISE',                   // ITW Leadership - X
    'ENTERPRISE_SAFETY_DIRECTOR',   // ITW Safety Director - X
    'SEGMENT',                      // Segment Leadership - X
    'SEGMENT_SAFETY_DIRECTOR',      // Segment Safety Director - X
    'PLATFORM_GROUP_PRESIDENT',    // Group President - X
    'PLATFORM_HR',                 // Platform HR Director - X
    'DIVISION_VP_GM_BUM',          // VP/GM/BUM - X
    'DIVISION_OPS_DIRECTOR',       // Operations Director - X
    'DIVISION_HR_DIRECTOR',        // Divisional HR Director - X
    'DIVISION_SAFETY',             // Divisional Safety Manager - X
    'PLANT_SAFETY_MANAGER',        // Plant Safety Manager - X
    'PLANT_SAFETY_CHAMPIONS',      // Plant Safety Champions - X
    'DIVISION_PLANT_MANAGER',      // Plant Manager - X
    'DIVISION_PLANT_HR'            // Plant HR Manager - X
  ],
  
  // ✅ Groups that can submit DSA tickets (from "Can Submit at Ticket To DSA" column)
  dsaTicketSubmitters: [
    'admin',
    'hr',
    'ENTERPRISE',                   // ITW Leadership - X
    'ENTERPRISE_SAFETY_DIRECTOR',   // ITW Safety Director - X
    'SEGMENT',                      // Segment Leadership - X
    'SEGMENT_SAFETY_DIRECTOR',      // Segment Safety Director - X
    'PLATFORM_GROUP_PRESIDENT',    // Group President - X
    'PLATFORM_HR',                 // Platform HR Director - X
    'DIVISION_VP_GM_BUM',          // VP/GM/BUM - X
    'DIVISION_OPS_DIRECTOR',       // Operations Director - X
    'DIVISION_HR_DIRECTOR',        // Divisional HR Director - X
    'DIVISION_SAFETY',             // Divisional Safety Manager - X
    'PLANT_SAFETY_MANAGER',        // Plant Safety Manager - X
    'DIVISION_PLANT_MANAGER',      // Plant Manager - X
    'DIVISION_PLANT_HR'            // Plant HR Manager - X
  ],
  
  // ✅ Groups that can view PII (from "Can Add/View PII" column)
  piiViewers: [
    'admin',
    'hr',
    'ENTERPRISE_SAFETY_DIRECTOR',   // ITW Safety Director - X
    'SEGMENT_SAFETY_DIRECTOR',      // Segment Safety Director - X
    'PLATFORM_HR',                 // Platform HR Director - X
    'DIVISION_HR_DIRECTOR',        // Divisional HR Director - X
    'DIVISION_SAFETY',             // Divisional Safety Manager - X
    'PLANT_SAFETY_MANAGER',        // Plant Safety Manager - X
    'DIVISION_PLANT_HR'            // Plant HR Manager - X
  ]
};

// ✅ Enhanced S3 policy for all authenticated users (document upload)
const enhancedS3Policy = new Policy(backend.stack, "EnhancedS3Policy", {
  statements: [
    // Allow object operations in /public/* (general documents)
    new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      resources: [
        `${customBucket.bucketArn}/public/*`,
        `${customBucket.bucketArn}/recognition-photos/*`
      ]
    }),
    // Allow object operations in /pii/* (PII documents - upload only)
    new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      resources: [`${customBucket.bucketArn}/pii/*`]
    }),
    // Allow listing the bucket (required for copy/move)
    new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ["s3:ListBucket"],
      resources: [customBucket.bucketArn]
    })
  ]
});

// ✅ PII View Policy - Only for users who can view PII
const piiViewPolicy = new Policy(backend.stack, "PIIViewPolicy", {
  statements: [
    // Allow viewing PII documents
    new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        "s3:GetObject"
      ],
      resources: [`${customBucket.bucketArn}/pii/*`]
    })
  ]
});

// ✅ Create IAM policies for functional permissions
const createFunctionalPermissionPolicy = (actionType: string, allowedGroups: string[]) => {
  return new Policy(backend.stack, `${actionType}Policy`, {
    statements: [
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'dynamodb:PutItem',
          'dynamodb:UpdateItem',
          'dynamodb:GetItem',
          'dynamodb:Query'
        ],
        resources: [
          `arn:aws:dynamodb:*:*:table/Submission-*`,
          `arn:aws:dynamodb:*:*:table/UserRole-*`,
          `arn:aws:dynamodb:*:*:table/RolePermission-*`
        ],
        conditions: {
          'ForAllValues:StringEquals': {
            'dynamodb:Attributes': [
              'status',
              'investigationStatus',
              'approvalStatus',
              'closureStatus',
              'rcaStatus',
              'quickFixStatus'
            ]
          }
        }
      })
    ]
  });
};

// ✅ Attach enhanced S3 policy to authenticated user role (all users can upload)
backend.auth.resources.authenticatedUserIamRole.attachInlinePolicy(enhancedS3Policy);

// ✅ All RBAC groups that need S3 access
const allRbacGroups = [
  'admin', 
  'hr', 
  'ENTERPRISE', 
  'ENTERPRISE_SAFETY_DIRECTOR',
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
];

// ✅ Apply S3 and functional permission policies to all RBAC groups
allRbacGroups.forEach(groupName => {
  if (backend.auth.resources.groups && backend.auth.resources.groups[groupName]) {
    // All groups get S3 access
    backend.auth.resources.groups[groupName].role.attachInlinePolicy(enhancedS3Policy);
    
    // Only PII-authorized groups get PII view access
    if (functionalPermissionGroups.piiViewers.includes(groupName)) {
      backend.auth.resources.groups[groupName].role.attachInlinePolicy(piiViewPolicy);
    }
  }
});

// ✅ Apply functional permission policies to groups
Object.entries(functionalPermissionGroups).forEach(([permissionType, groups]) => {
  const policy = createFunctionalPermissionPolicy(permissionType, groups);
  
  groups.forEach(groupName => {
    if (backend.auth.resources.groups && backend.auth.resources.groups[groupName]) {
      backend.auth.resources.groups[groupName].role.attachInlinePolicy(policy);
      console.log(`✅ Added ${permissionType} permissions to group: ${groupName}`);
    }
  });
});




// ====== Secure access to lookup data files in private S3 bucket ======
const lookupBucketName = 'simsstoragereflkpdata';
const lookupBucketArn = `arn:aws:s3:::${lookupBucketName}`;

// ✅ FIXED: Define both lookup files that need access
const lookupFiles = [
  'lookupValues.json',
  'hierarchy-mapping.json'
];

// Import your private lookup S3 bucket
const lookupBucket = Bucket.fromBucketName(
  backend.stack,
  "LookupDataBucket",
  lookupBucketName
);

if (backend.storage?.resources?.bucket) {
  const lookupBucket = backend.storage.resources.bucket;
  const lookupBucketCfn = lookupBucket.node.defaultChild as CfnBucket;

  lookupBucketCfn.addPropertyOverride('CorsConfiguration', {
    CorsRules: [
      {
        AllowedOrigins: [
          'http://localhost:3000',
          'http://localhost:3001',
          'https://yourdomain.com',
          'https://*.amplifyapp.com'
        ],
        AllowedMethods: ['GET', 'HEAD'],
        AllowedHeaders: ['*'],
        MaxAge: 3000,
        ExposedHeaders: ['ETag']
      }
    ]
  });

  // ✅ Also ensure public read access for lookup data
  lookupBucketCfn.addPropertyOverride('PublicAccessBlockConfiguration', {
    BlockPublicAcls: false,
    BlockPublicPolicy: false,
    IgnorePublicAcls: false,
    RestrictPublicBuckets: false
  });

  console.log('✅ S3 CORS configuration applied successfully');
} else {
  console.warn('⚠️ Storage bucket not found - CORS configuration skipped');
}

// ✅ FIXED: Read-only access policy for BOTH lookup files
const lookupReadPolicy = new PolicyStatement({
  effect: Effect.ALLOW,
  actions: ['s3:GetObject'],
  resources: lookupFiles.map(file => `${lookupBucketArn}/${file}`) // ✅ Now includes both files
});





// ====== DynamoDB access for Smartsheet integration ======
const dynamoDBAccess = new PolicyStatement({
  effect: Effect.ALLOW,
  actions: [
    'dynamodb:PutItem',
    'dynamodb:GetItem',
    'dynamodb:Query',
    'dynamodb:Scan',
    'dynamodb:BatchWriteItem'
  ],
  resources: ['*'] // Ideally scope this down to specific tables
});

// ====== CloudWatch Logs access for monitoring and debugging ======
const cloudWatchLogsAccess = new PolicyStatement({
  effect: Effect.ALLOW,
  actions: [
    'logs:CreateLogGroup',
    'logs:CreateLogStream',
    'logs:PutLogEvents',
    'logs:DescribeLogStreams'
  ],
  resources: ['arn:aws:logs:*:*:*']
});

// ✅ Attach lookup access to authenticated user role
backend.auth.resources.authenticatedUserIamRole.addToPrincipalPolicy(lookupReadPolicy);

// ✅ Attach DynamoDB and CloudWatch access to authenticated users
backend.auth.resources.authenticatedUserIamRole.addToPrincipalPolicy(dynamoDBAccess);
backend.auth.resources.authenticatedUserIamRole.addToPrincipalPolicy(cloudWatchLogsAccess);

export default backend;
