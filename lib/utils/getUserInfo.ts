// lib/utils/getUserInfo.ts
import { fetchAuthSession, getCurrentUser } from 'aws-amplify/auth';
import { jwtDecode } from 'jwt-decode';

interface UserInfo {
  username: string;
  email: string;
  name: string;
  given_name: string;
  lastName: string;
  groups: string[];
  token: string;
  rawDecoded: {
    access: DecodedToken;
    id: DecodedToken;
  };
}

interface DecodedToken {
  "cognito:username"?: string;
  "cognito:groups"?: string[];
  email?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  [key: string]: any;
}

 export async function getUserInfo(): Promise<UserInfo> {
  try {
    // ✅ FIXED: Better authentication check
    let user;
    try {
      user = await getCurrentUser();
    } catch (userError) {
      console.error('getCurrentUser failed:', userError);
      throw new Error('User not authenticated. Please log in.');
    }
    
    // ✅ FIXED: Enhanced session handling with retry logic
    let session;
    try {
      session = await fetchAuthSession({ forceRefresh: false });
      
      // ✅ Check if tokens are valid
      if (!session.tokens || !session.tokens.accessToken) {
        console.log('No valid tokens, forcing refresh...');
        session = await fetchAuthSession({ forceRefresh: true });
      }
    } catch (sessionError) {
      console.error('Session fetch failed:', sessionError);
      throw new Error('Unable to get valid session. Please log in again.');
    }

    if (!session.tokens) {
      throw new Error('No valid tokens found. Please log in again.');
    }

    const accessToken = session.tokens.accessToken?.toString();
    const idToken = session.tokens.idToken?.toString();

    if (!accessToken || !idToken) {
      throw new Error('Invalid tokens. Please log in again.');
    }

    // ✅ FIXED: Better token decoding with error handling
    let decodedAccess: DecodedToken;
    let decodedId: DecodedToken;
    
    try {
      decodedAccess = jwtDecode(accessToken);
      decodedId = jwtDecode(idToken);
    } catch (decodeError) {
      console.error('Token decode failed:', decodeError);
      throw new Error('Invalid token format. Please log in again.');
    }

    // ✅ Extract user info with fallbacks
    const email = decodedId.email || decodedAccess.email || user.username;
    const given_name = decodedId.given_name || '';
    const lastName = decodedId.family_name || '';
    const groups = decodedAccess["cognito:groups"] || [];
    
    let fullName = decodedId.name || '';
    if (!fullName && (given_name || lastName)) {
      fullName = [given_name, lastName].filter(Boolean).join(' ');
    }

    const userInfo = {
      username: user?.username ?? decodedAccess["cognito:username"] ?? "Unknown",
      email: email || "Unknown",
      name: fullName || user?.username || "Unknown",
      given_name: given_name,
      lastName: lastName,
      groups: groups,
      token: accessToken,
      rawDecoded: {
        access: decodedAccess,
        id: decodedId,
      },
    };

    console.log("✅ User Info Helper:", {
      email: userInfo.email,
      groups: userInfo.groups,
      username: userInfo.username,
      hasValidToken: !!accessToken
    });

    return userInfo;
  } catch (error) {
    console.error("❌ Error fetching user info:", error);
    
    // ✅ Enhanced error handling
    if (error instanceof Error) {
      if (error.message.includes('Invalid login token') || 
          error.message.includes('User not authenticated') ||
          error.message.includes('Please log in')) {
        // ✅ Don't redirect automatically, let the app handle it
        throw error;
      }
    }
    
    // ✅ Return minimal fallback for non-critical errors
    const emptyToken: DecodedToken = {};
    return {
      username: 'Unknown',
      email: 'Unknown',
      name: 'Unknown',
      given_name: '',
      lastName: '',
      groups: [],
      token: '',
      rawDecoded: {
        access: emptyToken,
        id: emptyToken
      },
    };
  }
}

