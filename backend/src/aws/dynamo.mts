import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const envPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", ".env");
dotenv.config({ path: envPath, quiet: true });

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
});

export const ddb = DynamoDBDocumentClient.from(client);
export const TABLE_NAME = process.env.DYNAMO_TABLE!;
export const HIGHLIGHT_TABLE_NAME = process.env.HIGHLIGHT_DYNAMO_TABLE || process.env.DYNAMO_HIGHLIGHT_TABLE;
export const CAMERA_METADATA_TABLE_NAME =
  process.env.CAMERA_METADATA_TABLE || process.env.DYNAMO_CAMERA_METADATA_TABLE;
