// app/api/s3-move/route.ts
import { NextResponse } from 'next/server';
import { S3Client, CopyObjectCommand, DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";

// Create S3 client without explicit credentials - rely on IAM roles
const s3 = new S3Client({ region: 'us-east-1' });

export async function POST(request: Request) {
  try {
    const { sourceKey, destinationKey } = await request.json();

    if (!sourceKey || !destinationKey) {
      return NextResponse.json({ error: 'Missing sourceKey or destinationKey' }, { status: 400 });
    }

    const bucketName = 'simsstorage2.0';

    console.log('🚀 Moving S3 object:', {
      sourceKey,
      destinationKey,
      bucket: bucketName
    });

    // Check if source exists
    try {
      await s3.send(new HeadObjectCommand({
        Bucket: bucketName,
        Key: sourceKey,
      }));
    } catch (err) {
      console.error('❌ Source file does not exist:', sourceKey, err);
      return NextResponse.json({
        error: 'Source file does not exist',
        details: `File not found at ${sourceKey}`,
        originalError: (err as Error).message
      }, { status: 400 });
    }

    // Copy the object to the new location
    try {
      await s3.send(new CopyObjectCommand({
        Bucket: bucketName,
        CopySource: `${bucketName}/${encodeURIComponent(sourceKey)}`,
        Key: destinationKey,
      }));
    } catch (err) {
      console.error('❌ Failed to copy object:', err);
      return NextResponse.json({
        error: 'Failed to copy file',
        details: (err as Error).message
      }, { status: 500 });
    }

    // Delete the original object
    try {
      await s3.send(new DeleteObjectCommand({
        Bucket: bucketName,
        Key: sourceKey,
      }));
    } catch (err) {
      console.error('❌ Failed to delete original object:', err);
      return NextResponse.json({
        error: 'File copied but failed to delete original',
        details: (err as Error).message
      }, { status: 500 });
    }

    console.log('✅ S3 move completed successfully');

    return NextResponse.json({
      message: 'File moved successfully',
      from: sourceKey,
      to: destinationKey
    });
  } catch (error) {
    console.error('❌ Error moving S3 object:', error);
    return NextResponse.json({
      error: 'Failed to move file',
      details: (error as Error).message,
      stack: (error as Error).stack
    }, { status: 500 });
  }
}
