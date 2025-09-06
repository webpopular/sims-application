// app/api/image-preview/route.ts
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";
import { Readable } from "stream";

const s3 = new S3Client({
  region: process.env.MY_AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.MY_AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.MY_AWS_SECRET_ACCESS_KEY!,
  },
});

export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get('key');
  
  if (!key) {
    return new NextResponse('Missing key parameter', { status: 400 });
  }
  
  try {
    console.log('Image preview requested for:', key);
    
     const command = new GetObjectCommand({
      Bucket: "simsstorage2.0",
      Key: key,
    });

    const response = await s3.send(command);
    
    if (!response.Body) {
      throw new Error("Empty response body");
    }

    // Convert the readable stream to a Response object
    const stream = response.Body as Readable;
    const headers = new Headers();
    
    // Set appropriate content type
    if (response.ContentType) {
      headers.set('Content-Type', response.ContentType);
    }
    
    // Create a new response with the stream
    return new NextResponse(stream as any, {
      headers,
    });
  } catch (err: any) {
    console.error('Error fetching image from S3:', err);
    return NextResponse.json({ error: "Failed to load image" }, { status: 500 });
  }
}
