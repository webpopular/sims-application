// lib/utils/getUserGroups.ts

import { fetchAuthSession } from 'aws-amplify/auth';
import { jwtDecode } from 'jwt-decode';  

export async function getUserGroups(): Promise<string[]> {
  try {
    const { tokens } = await fetchAuthSession();
    const accessToken = tokens?.accessToken?.toString();

    if (accessToken) {
      const decoded: any = jwtDecode(accessToken);  
      const groups = decoded["cognito:groups"] || [];
      console.log("Decoded groups:", groups);
      return groups;
    }
  } catch (error) {
    console.error("Error decoding user groups:", error);
  }

  return [];
}
