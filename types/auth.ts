// types/auth.ts
export interface PermissionMapping {
    'custom:qrReview': 'Can Review QR Codes',
    'custom:injuryEntry': 'Injury Direct Entry',
    'custom:obsEntry': 'Direct Obs. Entry',
    'custom:injuryReport': 'Can Complete a First Report of Injury',
    'custom:obsReport': 'Can Complete a First Report of Observation',
    'custom:resolveInjury': 'Can Resolve an Injury Report',
    'custom:resolveObs': 'Can Resolve an Observation Reports',
    'custom:closeInjury': 'Can Close an Injury Report',
    'custom:closeObs': 'Can Close an Observation Report'
  }
  
  export interface UserProfile {
    permissions: {
      qrReview: 'Y' | 'N';
      injuryEntry: 'Y' | 'N';
      obsEntry: 'Y' | 'N';
      injuryReport: 'Y' | 'N';
      obsReport: 'Y' | 'N';
      resolveInjury: 'Y' | 'N';
      resolveObs: 'Y' | 'N';
      closeInjury: 'Y' | 'N';
      closeObs: 'Y' | 'N';
    };
    plantAccess: Array<{
      plantName: string;
      divisionName: string;
    }>;
  }