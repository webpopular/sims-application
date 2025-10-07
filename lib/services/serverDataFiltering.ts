// lib/services/serverDataFiltering.ts - SERVER-SIDE VERSION

type AccessScope = 'ENTERPRISE' | 'SEGMENT' | 'PLATFORM' | 'DIVISION' | 'PLANT';

type UserAccessForFilter = {
  // Required for building the filter
  hierarchyString: string;

  // Optional metadata we’ll normalize/derive
  level?: number;                // 1..5 (if present we’ll derive accessScope)
  accessScope?: AccessScope;     // if provided we’ll use it directly
  enterprise?: string;
  segment?: string;
  platform?: string;
  division?: string;
  plant?: string;
  divisionName?: string;         // optional, we’ll fall back to division
  plantName?: string;            // optional, we’ll fall back to plant
  email?: string;                // optional, just for logging
};

// Derive access scope (fallback to PLANT)
function scopeFrom(user: UserAccessForFilter): AccessScope {
  if (user.accessScope) return user.accessScope;
  switch (user.level) {
    case 1: return 'ENTERPRISE';
    case 2: return 'SEGMENT';
    case 3: return 'PLATFORM';
    case 4: return 'DIVISION';
    default: return 'PLANT';
  }
}

export const buildServerHierarchyFilter = (user: UserAccessForFilter) => {
  const scope = scopeFrom(user);
  const { hierarchyString } = user;

  // Normalize optional names (available if you later need to compose paths)
  const divisionName = user.divisionName ?? user.division ?? '';
  const plantName    = user.plantName    ?? user.plant    ?? '';

  // Helpful logs (don’t crash if fields are missing)
  console.log(`🔍 [ServerDataFilter] Building filter for ${scope} user:`, user.email ?? '(unknown)');
  console.log(`🔍 [ServerDataFilter] User hierarchy:`, hierarchyString);

  // If your hierarchyString is already the correct prefix at each level,
  // beginsWith/eq on it is sufficient.
  switch (scope) {
    case 'ENTERPRISE':
      console.log(`✅ [ServerDataFilter] Enterprise access - no restrictions`);
      return {}; // See everything

    case 'SEGMENT':
    case 'PLATFORM':
    case 'DIVISION':
      console.log(`✅ [ServerDataFilter] ${scope} access - filtering by prefix`);
      return { hierarchyString: { beginsWith: hierarchyString } };

    case 'PLANT':
    default:
      console.log(`✅ [ServerDataFilter] Plant access - exact hierarchy match`);
      return { hierarchyString: { eq: hierarchyString } };
  }
};
