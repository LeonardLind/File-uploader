// services/dynamoService.mts

import {
  PutItemCommand,
  DeleteItemCommand,
  ScanCommand,
  type PutItemCommandInput,
  type DeleteItemCommandInput,
  type ScanCommandInput,
} from "@aws-sdk/client-dynamodb";

import { dynamoClient } from "../config/awsClient.mjs";

// -----------------------------
// TYPES
// -----------------------------

// A DynamoDB "Item" is an object where every value is a DynamoDB AttributeValue.
export type DynamoItem = Record<string, { S: string }>;

// -----------------------------
// SAVE METADATA
// -----------------------------

/**
 * Saves metadata entry in DynamoDB.
 */
export async function saveMetadata(item: DynamoItem): Promise<void> {
  const command: PutItemCommandInput = {
    TableName: process.env.DYNAMO_TABLE as string,
    Item: item,
  };

  await dynamoClient.send(new PutItemCommand(command));
}

// -----------------------------
// DELETE METADATA
// -----------------------------

/**
 * Removes an item by fileId.
 */
export async function deleteMetadata(fileId: string): Promise<void> {
  const command: DeleteItemCommandInput = {
    TableName: process.env.DYNAMO_TABLE as string,
    Key: { fileId: { S: fileId } },
  };

  await dynamoClient.send(new DeleteItemCommand(command));
}

// -----------------------------
// GET ALL METADATA
// -----------------------------

/**
 * Returns all metadata items in the table.
 */
export async function getAllMetadata() {
  try {
    const command = new ScanCommand({
      TableName: process.env.DYNAMO_TABLE,
    });
    const result = await dynamoClient.send(command);
    return result.Items;
  } catch (err) {
    console.error("🔥 DynamoDB Scan ERROR:", err);
    throw err;
  }
}

