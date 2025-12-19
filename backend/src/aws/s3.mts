import { S3Client, DeleteObjectCommand, type DeleteObjectCommandInput, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import dotenv from "dotenv";

dotenv.config({ quiet: true });

const region = process.env.AWS_REGION || "us-east-1";

export const s3Client = new S3Client({
  region,
});

type PresignInput = {
  Bucket: string;
  Key: string;
  ContentType: string;
  Expires?: number; // seconds
};

export async function getPresignedPutUrl(params: PresignInput): Promise<string> {
  const { Expires, ...rest } = params;
  const expiresIn = Expires ?? 300;
  return getSignedUrl(s3Client, new PutObjectCommand(rest), { expiresIn });
}

export async function deleteObject(params: DeleteObjectCommandInput): Promise<void> {
  await s3Client.send(new DeleteObjectCommand(params));
}
