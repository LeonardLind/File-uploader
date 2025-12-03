import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import dotenv from "dotenv";

dotenv.config();

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
});

export const ddb = DynamoDBDocumentClient.from(client);
export const TABLE_NAME = process.env.DYNAMO_TABLE!;
export const HIGHLIGHT_TABLE_NAME = process.env.HIGHLIGHT_DYNAMO_TABLE || process.env.DYNAMO_HIGHLIGHT_TABLE;
