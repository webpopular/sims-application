// /app/utils/fileUpload.ts
// /app/utils/fileUpload.ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { fetchAuthSession } from 'aws-amplify/auth';
import { getUrl, uploadData } from 'aws-amplify/storage';

/**
 * Uploads a file to S3 using Amplify Storage
 * @param file The file to upload
 * @param path Optional path prefix
 * @returns Promise with the S3 URL of the uploaded file
 */
 

 
export const uploadFileToS3 = async (file: File, path: string = 'safetyalertphotos/'): Promise<{ key: string, url: string }> => {
    try {
      // Generate a unique filename
      const timestamp = Date.now();
      const filename = `${timestamp}-${file.name.replace(/\s+/g, '-')}`;
      const key = `public/${path}${filename}`;
      
      // Upload file using Amplify Storage
      const result = await uploadData({
        path: key,
        data: file,
        options: {
          bucket: 'safetyAlertStorage',
          contentType: file.type,
          metadata: {
            // For PDFs, ensure proper display
            ...(file.type === 'application/pdf' && {
              'Content-Disposition': 'inline'
            })
          }
        }
      }).result;
      
      // Generate a URL for immediate use
      const urlResult = await getUrl({
        path: key,
        options: {
          bucket: 'safetyAlertStorage',
          validateObjectExistence: false,
          // For PDFs, ensure proper content type in response
          ...(file.type === 'application/pdf' && {
            responseContentType: 'application/pdf',
            responseContentDisposition: 'inline'
          })
        }
      });
      
      return {
        key: key,
        url: urlResult.url.toString()
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  };
  
  
  

  
  
/**
 * Generates a presigned URL for an S3 object using Amplify Storage
 * @param key The S3 object key
 * @param expiresIn Expiration time in seconds (default: 7 days)
 * @returns Promise with the presigned URL
 */
export const generatePresignedUrl = async (key: string, expiresIn: number = 604800): Promise<string> => {
  try {
    console.log('Starting presigned URL generation...');
    console.log('Key:', key);
    console.log('Expiration time (seconds):', expiresIn);
    console.log('Using bucket name:', 'safetyAlertStorage');
    
    // Use the getUrl API with the logical bucket name
    console.log('Calling getUrl API...');
    const linkToStorageFile = await getUrl({
      path: key,
      options: {
        bucket: 'safetyAlertStorage', // Use the logical name from Amplify config
        validateObjectExistence: false, // Disable validation to avoid HEAD request issues
        expiresIn: expiresIn,
      }
    });
    
    console.log('Presigned URL generated successfully!');
    console.log('URL object:', linkToStorageFile);
    console.log('URL string:', linkToStorageFile.url.toString());
    
    // Return the URL as a string
    return linkToStorageFile.url.toString();
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    throw error;
  }
};
