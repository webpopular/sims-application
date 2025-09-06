// Enhanced /app/utils/imageUtils.ts
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { fetchAuthSession } from 'aws-amplify/auth';

export const loadImageAsBase64 = async (url: string, preferredFormat: 'png' | 'jpeg' = 'jpeg'): Promise<string> => {
  // Add a cache-busting parameter to avoid cached responses
  const urlWithCacheBuster = `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`;
  let imageUrl = urlWithCacheBuster;
  
  // Check if it's an S3 URL
  if (url.includes('simsstoragesafetyalert.s3.amazonaws.com')) {
    try {
      // Get the key from the URL
      const key = url.split('simsstoragesafetyalert.s3.amazonaws.com/')[1];
      
      // Get credentials from Amplify Auth
      const { credentials } = await fetchAuthSession();
      
      if (!credentials) {
        throw new Error('No credentials available');
      }
      
      // Create S3 client with credentials from Amplify
      const s3Client = new S3Client({ 
        region: 'us-east-1',
        credentials: {
          accessKeyId: credentials.accessKeyId,
          secretAccessKey: credentials.secretAccessKey,
          sessionToken: credentials.sessionToken
        }
      });
      
      // Generate presigned URL directly
      const command = new GetObjectCommand({
        Bucket: 'simsstoragesafetyalert',
        Key: key
      });
      
      const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
      imageUrl = presignedUrl;
      
    } catch (error) {
      console.error('Error getting presigned URL:', error);
      // Continue with original URL if presigned URL fails
    }
  }
  
  // Determine image format based on URL and preference
  const isJpeg = url.toLowerCase().includes('.jpg') || 
                url.toLowerCase().includes('.jpeg');
  const isPng = url.toLowerCase().includes('.png');
  
  // Use detected format or fall back to preferred format
  const outputFormat = isPng ? 'image/png' : 
                     isJpeg ? 'image/jpeg' : 
                     `image/${preferredFormat}`;
  
  // Now load the image using the URL (presigned if from S3)
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    
    // Set a timeout to handle stalled image loading
    const timeoutId = setTimeout(() => {
      console.warn('Image load timeout, generating placeholder');
      // Create a placeholder image instead of failing
      const canvas = document.createElement('canvas');
      canvas.width = 300;
      canvas.height = 200;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#EEEEEE';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#999999';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Image Failed to Load', canvas.width/2, canvas.height/2);
        resolve(canvas.toDataURL(`image/${preferredFormat}`, 0.8));
      } else {
        reject(new Error('Failed to create canvas context'));
      }
    }, 10000); // 10 second timeout
    
    img.onload = () => {
      clearTimeout(timeoutId);
      
      // Check if image has valid dimensions
      if (img.width === 0 || img.height === 0) {
        console.error('Image loaded with invalid dimensions');
        reject(new Error('Image has invalid dimensions'));
        return;
      }
      
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Failed to create canvas context'));
        return;
      }
      
      // Fill with white background for JPEGs (prevents transparency issues)
      if (outputFormat === 'image/jpeg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      
      try {
        // Draw image with error handling
        ctx.drawImage(img, 0, 0);
        
        // Use appropriate quality for JPEG (0.95 is good balance)
        const quality = outputFormat === 'image/jpeg' ? 0.95 : undefined;
        const dataUrl = canvas.toDataURL(outputFormat, quality);
        
        // Verify the data URL is valid
        if (dataUrl === 'data:,' || !dataUrl.includes('base64')) {
          throw new Error('Invalid data URL generated');
        }
        
        resolve(dataUrl);
      } catch (err) {
        console.error('Error drawing image to canvas:', err);
        reject(new Error('Failed to process image'));
      }
    };
    
    img.onerror = (err) => {
      clearTimeout(timeoutId);
      console.error('Image load error:', err);
      
      // Return a placeholder image instead of failing
      const canvas = document.createElement('canvas');
      canvas.width = 300;
      canvas.height = 200;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#EEEEEE';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#999999';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Image Failed to Load', canvas.width/2, canvas.height/2);
        resolve(canvas.toDataURL(`image/${preferredFormat}`, 0.8));
      } else {
        reject(new Error('Failed to create canvas context'));
      }
    };
    
    // Set image source last to start loading
    img.src = imageUrl;
  });
};
