//app/api/s3-presigned/route.ts

// NOT USED
import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { fetchAuthSession } from 'aws-amplify/auth';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const { key, operation, contentType } = await request.json();
    
    if (!key) {
      return NextResponse.json({ error: 'Missing key parameter' }, { status: 400 });
    }
    
    // Get credentials from the auth cookie or header
    let credentials;
    try {
      // Extract auth token from cookies or Authorization header
      const authHeader = request.headers.get('Authorization');
      if (!authHeader) {
        // For server-side API routes, skip auth check and use IAM role
        console.log("No auth header found, using IAM role credentials");
      }
      
      // Create S3 client with AWS region
      const s3Client = new S3Client({ 
        region: 'us-east-1'
      });
      
      // Default to GET if operation not specified
      const operationType = operation || 'get';
      
      let command;
      let url;
      
      if (operationType.toLowerCase() === 'get') {
        command = new GetObjectCommand({
          Bucket: 'simsstoragesafetyalert',
          Key: key
        });
        url = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour expiry
      } 
      else if (operationType.toLowerCase() === 'put') {
        command = new PutObjectCommand({
          Bucket: 'simsstoragesafetyalert',
          Key: key,
          ContentType: contentType || 'application/octet-stream'
        });
        url = await getSignedUrl(s3Client, command, { expiresIn: 300 }); // 5 minutes expiry for uploads
      }
      else {
        return NextResponse.json({ error: 'Invalid operation' }, { status: 400 });
      }
      
      return NextResponse.json({ url });
    } catch (error) {
      console.error('Error generating presigned URL:', error);
      return NextResponse.json({ error: 'Failed to generate presigned URL' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
