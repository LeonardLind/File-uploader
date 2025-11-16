import {
  PutCommand,
  GetCommand,
  ScanCommand,
  DeleteCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import type { Request, Response } from "express";
import { ddb, TABLE_NAME } from "../aws/dynamo.mjs";
import { s3 } from "../aws/s3.mjs";

export async function generatePresignedUrl(req: Request, res: Response): Promise<void> {
  try {
    const { filename, contentType, type } = req.body as {
      filename?: string;
      contentType?: string;
      type?: "video" | "thumbnail";
    };

    if (!filename || !contentType) {
      res.status(400).json({ success: false, error: "Missing filename or contentType" });
      return;
    }

    const prefix = type === "thumbnail" ? "thumbnails" : "uploads";

    const key = `${prefix}/${Date.now()}_${filename}`;

    const params = {
      Bucket: process.env.AWS_BUCKET as string,
      Key: key,
      ContentType: contentType,
      Expires: 300,
    };

    const uploadUrl = await s3.getSignedUrlPromise("putObject", params);
    res.json({ success: true, uploadUrl, key });
  } catch (err: unknown) {
    console.error("Error generating presigned URL:", err);
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Failed to generate presigned URL",
    });
  }
}


export async function saveMetadata(req: Request, res: Response): Promise<void> {
  try {
    const {
      fileId,
      thumbnailId,
      filename,
      species,
      plot,
      sensorId,
      deploymentId,
      experiencePoint,
    } = req.body as Record<string, any>;

    if (!fileId) {
      res.status(400).json({ success: false, error: "fileId is required" });
      return;
    }

    const base = {
      fileId,
      thumbnailId,
      filename,
      species,
      plot,
      sensorId,
      deploymentId,
      experiencePoint,
      updatedAt: new Date().toISOString(),
    };

    const item: Record<string, any> = {};
    for (const [key, value] of Object.entries(base)) {
      if (value !== undefined && value !== null && value !== "") {
        item[key] = value;
      }
    }

    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
    res.json({ success: true, item });
  } catch (err: unknown) {
    console.error("Error saving metadata:", err);
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Failed to save metadata",
    });
  }
}


export async function getAllMetadata(_req: Request, res: Response): Promise<void> {
  try {
    const data = await ddb.send(new ScanCommand({ TableName: TABLE_NAME }));
    res.json({ success: true, items: data.Items || [] });
  } catch (err: unknown) {
    console.error("Error fetching metadata:", err);
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Failed to fetch metadata",
    });
  }
}


export async function getMetadata(req: Request, res: Response): Promise<void> {
  try {
    const { fileId } = req.params;
    if (!fileId) {
      res.status(400).json({ success: false, error: "Missing fileId" });
      return;
    }

    const data = await ddb.send(new GetCommand({ TableName: TABLE_NAME, Key: { fileId } }));

    if (!data.Item) {
      res.status(404).json({ success: false, error: "Not found" });
      return;
    }

    res.json({ success: true, item: data.Item });
  } catch (err: unknown) {
    console.error("Error getting metadata:", err);
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Failed to get metadata",
    });
  }
}


export async function updateMetadata(req: Request, res: Response): Promise<void> {
  try {
    const { fileId, species, plot, experiencePoint, sensorId, deploymentId } =
      req.body as Record<string, any>;

    if (!fileId) {
      res.status(400).json({ success: false, error: "fileId is required" });
      return;
    }

    const fields = {
      species,
      plot,
      experiencePoint,
      sensorId,
      deploymentId,
      updatedAt: new Date().toISOString(),
    };

    const expressionParts: string[] = [];
    const names: Record<string, string> = {};
    const values: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        expressionParts.push(`#${key} = :${key}`);
        names[`#${key}`] = key;
        values[`:${key}`] = value;
      }
    }

    if (expressionParts.length === 0) {
      res.status(400).json({ success: false, error: "No fields to update" });
      return;
    }

    const result = await ddb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { fileId },
        UpdateExpression: "SET " + expressionParts.join(", "),
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
        ReturnValues: "ALL_NEW",
      })
    );

    res.json({ success: true, item: result.Attributes });
  } catch (err: unknown) {
    console.error("Error updating metadata:", err);
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Failed to update metadata",
    });
  }
}


export async function deleteFileAndMetadata(req: Request, res: Response): Promise<void> {
  try {
    const { fileId } = req.body as { fileId?: string };

    if (!fileId) {
      res.status(400).json({ success: false, error: "Missing fileId" });
      return;
    }

    await ddb.send(new DeleteCommand({ TableName: TABLE_NAME, Key: { fileId } }));

    await s3
      .deleteObject({
        Bucket: process.env.AWS_BUCKET as string,
        Key: fileId,
      })
      .promise();

    res.json({ success: true, message: "File and metadata deleted" });
  } catch (err: unknown) {
    console.error("Error deleting file and metadata:", err);
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete file and metadata",
    });
  }
}
