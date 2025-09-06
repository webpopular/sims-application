// app/api/s3-list/route.ts
import { NextResponse } from 'next/server';
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

// Define an interface for the file object
interface S3FileInfo {
  key: string;
  size: number | undefined;
  lastModified: Date | undefined;
}

const s3 = new S3Client({ region: 'us-east-1' }); // Ensure this matches your bucket region

export async function POST(request: Request) {
  try {
    const { prefix } = await request.json();

    if (!prefix) {
      return NextResponse.json({ error: 'Missing prefix parameter' }, { status: 400 });
    }

    const bucketName = 'simsstorage2.0';

    console.log('📋 Listing S3 objects with prefix:', {
      prefix,
      bucket: bucketName
    });

    // Try multiple prefix variations to find files
    const prefixVariations = [
      prefix,
      prefix.replace('public/', ''),
      `public/${prefix.replace(/^public\//, '')}`,
      prefix.toLowerCase()
    ];
    
    // Explicitly type the files array
    let files: S3FileInfo[] = [];
    let successfulPrefix = '';
    
    // Try each prefix variation
    for (const prefixVar of prefixVariations) {
      try {
        console.log(`Trying to list with prefix: ${prefixVar}`);
        
        const listCommand = new ListObjectsV2Command({
          Bucket: bucketName,
          Prefix: prefixVar,
          MaxKeys: 50,
        });
        
        const listResult = await s3.send(listCommand);
        
        if (listResult.Contents && listResult.Contents.length > 0) {
          files = listResult.Contents.map(item => ({
            key: item.Key || '',
            size: item.Size,
            lastModified: item.LastModified
          }));
          
          successfulPrefix = prefixVar;
          break;
        }
      } catch (err) {
        console.error(`Failed to list objects with prefix: ${prefixVar}`, err);
        // Continue to the next prefix variation
      }
    }
    
    return NextResponse.json({ 
      files,
      successfulPrefix,
      count: files.length,
      triedPrefixes: prefixVariations
    });
  } catch (error) {
    console.error('❌ Error listing S3 objects:', error);
    return NextResponse.json({ 
      error: 'Failed to list objects', 
      details: (error as Error).message,
      stack: (error as Error).stack
    }, { status: 500 });
  }
}
