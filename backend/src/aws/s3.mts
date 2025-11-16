// src/services/s3Service.mts
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client } from "../config/awsClient.mjs"; 

export const BUCKET_NAME = process.env.BUCKET_NAME;

/**
 * Uploads a file buffer directly to S3.
 */
export async function uploadToS3(
  key: string,
  buffer: Buffer | Uint8Array,
  contentType: string
) {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });

  await s3Client.send(command);
}

/**
 * Creates a presigned URL for uploading via browser.
 */
export async function presignUpload(
  key: string,
  contentType: string
) {
  // TODO: move your old presigning logic here  
  // Example if using v3 S3 presigner:
  //
  // const command = new PutObjectCommand({
  //   Bucket: BUCKET_NAME,
  //   Key: key,
  //   ContentType: contentType,
  // });
  //
  // return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
}
