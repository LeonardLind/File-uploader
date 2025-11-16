// services/s3Service.mts

import {
  PutObjectCommand,
  type PutObjectCommandInput,
} from "@aws-sdk/client-s3";

import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client } from "../config/awsClient.mjs";

export const BUCKET_NAME = process.env.BUCKET_NAME as string;

// ------------------------------
// UPLOAD BINARY DATA DIRECTLY
// ------------------------------

/**
 * Upload a file buffer directly to S3
 */
export async function uploadToS3(
  key: string,
  buffer: Buffer | Uint8Array,
  contentType: string
): Promise<void> {
  const command: PutObjectCommandInput = {
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  };

  await s3Client.send(new PutObjectCommand(command));
}

// ------------------------------
// PRESIGN URL FOR BROWSER UPLOAD
// ------------------------------

/**
 * Return a presigned upload URL for the frontend.
 */
export async function presignUpload(
  key: string,
  contentType: string
): Promise<{ uploadUrl: string; key: string }> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, {
    expiresIn: 300, // 5 minutes
  });

  return { uploadUrl, key };
}
