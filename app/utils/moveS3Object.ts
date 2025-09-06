// app/utils/moveS3Object.ts
import { copy, remove, getProperties } from 'aws-amplify/storage';

/**
 * Wait for an S3 object to exist (with retries for eventual consistency).
 */
async function waitForS3Object(
  path: string,
  maxTries = 10,
  delayMs = 1000
): Promise<void> {
  for (let i = 0; i < maxTries; i++) {
    try {
      console.log(`[waitForS3Object] Try ${i + 1}: Checking path: ${path}`);
      await getProperties({ path });
      console.log(`[waitForS3Object] Found: ${path}`);
      return;
    } catch (error: any) {
      if (
        (error.name === "S3Exception" || error.name === "NotFound") &&
        i < maxTries - 1
      ) {
        console.warn(`[waitForS3Object] Not found yet, retrying... (${i + 1})`);
        await new Promise(res => setTimeout(res, delayMs));
      } else {
        console.error(`[waitForS3Object] Final failure on: ${path}`, error);
        throw error;
      }
    }
  }
  throw new Error(`Source path does not exist after ${maxTries} tries: ${path}`);
}

/**
 * Move an S3 object by copying it to a new location and deleting the original.
 * Both sourceKey and destKey must be relative to the identityId!
 */
export async function moveS3Object({
    sourceKey,
    destKey
  }: {
    sourceKey: string,
    destKey: string
  }): Promise<string> {
    const src = sourceKey;
    const dst = destKey;
    console.log("Moving S3 object from:", src, "to:", dst);
  
    await waitForS3Object(src);
  
    await copy({
      source: { path: src },
      destination: { path: dst }
    });
  
    await remove({ path: src });
  
    return dst;
  }
  
