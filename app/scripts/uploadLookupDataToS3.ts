import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import * as fs from "fs";
import * as path from "path";

const REGION = "us-east-1";
const BUCKET = "simsapp-lookup-data";
const KEY = "lookupValues.json";

const client = new S3Client({ region: REGION });

async function uploadLookupData() {
  const filePath = path.join(__dirname, "../data/lookup-data/lookupValues.json");
  const fileContent = fs.readFileSync(filePath);

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: KEY,
    Body: fileContent,
    ContentType: "application/json",
    CacheControl: "public, max-age=86400", // cache for 1 day in CloudFront
  });

  await client.send(command);
  console.log(`✅ Uploaded ${KEY} to ${BUCKET}`);
}

uploadLookupData().catch(console.error);
