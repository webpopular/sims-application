// app/api/s3-check/route.ts
import { NextResponse } from 'next/server';
import { S3Client, HeadObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({ region: 'us-east-1' });

export async function POST(request: Request) {
  try {
    const { key } = await request.json();

    if (!key) {
      return NextResponse.json({ error: 'Missing key parameter' }, { status: 400 });
    }

    const bucketName = 'simsstorage2.0';

    console.log('🔍 Checking if S3 object exists:', {
      key,
      bucket: bucketName
    });

    try {
      await s3.send(new HeadObjectCommand({
        Bucket: bucketName,
        Key: key,
      }));
      
      // If we get here, the object exists
      return NextResponse.json({ exists: true, key });
    } catch (err) {
      console.log(`Object does not exist at key: ${key}`);
      return NextResponse.json({ exists: false, key });
    }
  } catch (error) {
    console.error('❌ Error checking S3 object:', error);
    return NextResponse.json({ 
      error: 'Failed to check if file exists', 
      details: (error as Error).message
    }, { status: 500 });
  }
}
