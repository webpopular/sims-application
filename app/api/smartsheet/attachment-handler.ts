// app/api/smartsheet/attachment-handler.ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({});

interface SmartsheetAttachment {
  id: string;
  name: string;
  attachmentType: string;
  mimeType: string;
  sizeInKb: number;
  url?: string;
}

export async function downloadAndUploadAttachments(
  sheetId: string, 
  recognitionId: string, 
  attachments: SmartsheetAttachment[]
): Promise<{ mediaUploadUrl: string; thumbnailS3Key: string; photoSize: string; photoType: string } | null> {
  
  if (!attachments || attachments.length === 0) {
    console.log('No attachments found for recognition record');
    return null;
  }

  try {
    // Process the first attachment (assuming one photo per recognition)
    const attachment = attachments[0];
    
    if (attachment.attachmentType !== 'FILE') {
      console.log('Attachment is not a file, skipping');
      return null;
    }

    // ✅ Get attachment URL from Smartsheet API
    const attachmentUrl = await getSmartsheetAttachmentUrl(sheetId, attachment.id);
    
    if (!attachmentUrl) {
      console.log('Could not get attachment URL from Smartsheet');
      return null;
    }

    // ✅ Download the file from Smartsheet
    const fileBuffer = await downloadFileFromSmartsheet(attachmentUrl);
    
    if (!fileBuffer) {
      console.log('Could not download file from Smartsheet');
      return null;
    }

    // ✅ Upload to S3 following PhotoUploadModal pattern
    const timestamp = Date.now();
    const s3Key = `recognition-photos/${recognitionId}/${timestamp}_${attachment.name}`;
    const thumbnailKey = `recognition-photos/${recognitionId}/thumb_${timestamp}_${attachment.name}`;
    
    const uploadResult = await uploadToS3(fileBuffer, s3Key, attachment.mimeType);
    
    if (!uploadResult) {
      console.log('Could not upload file to S3');
      return null;
    }

    // ✅ Generate thumbnail if it's an image
    let thumbnailS3Key = '';
    if (attachment.mimeType.startsWith('image/')) {
      const thumbnailResult = await uploadToS3(fileBuffer, thumbnailKey, attachment.mimeType);
      if (thumbnailResult) {
        thumbnailS3Key = thumbnailKey;
      }
    }

    return {
      mediaUploadUrl: s3Key,
      thumbnailS3Key: thumbnailS3Key,
      photoSize: (attachment.sizeInKb * 1024).toString(),
      photoType: attachment.mimeType
    };

  } catch (error) {
    console.error('Error processing attachments:', error);
    return null;
  }
}

async function getSmartsheetAttachmentUrl(sheetId: string, attachmentId: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://api.smartsheet.com/2.0/sheets/${sheetId}/attachments/${attachmentId}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.SMARTSHEET_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      console.error(`Failed to get attachment URL: ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    return data.url || null;
    
  } catch (error) {
    console.error('Error getting attachment URL:', error);
    return null;
  }
}

async function downloadFileFromSmartsheet(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`Failed to download file: ${response.statusText}`);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
    
  } catch (error) {
    console.error('Error downloading file:', error);
    return null;
  }
}

async function uploadToS3(fileBuffer: Buffer, s3Key: string, mimeType: string): Promise<boolean> {
  try {
    const command = new PutObjectCommand({
      Bucket: 'simsstorage2.0',
      Key: s3Key,
      Body: fileBuffer,
      ContentType: mimeType,
      Metadata: {
        source: 'smartsheet',
        uploadedAt: new Date().toISOString()
      }
    });

    await s3Client.send(command);
    console.log(`✅ Successfully uploaded to S3: ${s3Key}`);
    return true;
    
  } catch (error) {
    console.error('Error uploading to S3:', error);
    return false;
  }
}
