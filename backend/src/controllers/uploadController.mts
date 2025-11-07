import { PutCommand, GetCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "../aws/dynamo.mjs";
import { s3 } from "../aws/s3.mjs";
import type { Request, Response } from "express";

/**
 * Generate a pre-signed S3 upload URL
 */
export async function generatePresignedUrl(req: Request, res: Response) {
  try {
    const { filename, contentType } = req.body;

    if (!filename || !contentType) {
      return res
        .status(400)
        .json({ success: false, error: "Missing filename or contentType" });
    }

    const key = `uploads/${Date.now()}_${filename}`;

    const params = {
      Bucket: process.env.AWS_BUCKET!,
      Key: key,
      ContentType: contentType,
      Expires: 300, // 5 minutes
    };

    const uploadUrl = await s3.getSignedUrlPromise("putObject", params);

    res.json({ success: true, uploadUrl, key });
  } catch (err: any) {
    console.error("❌ Error generating presigned URL:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Failed to generate presigned URL",
    });
  }
}

/**
 * Save metadata for an uploaded file
 */
export async function saveMetadata(req: Request, res: Response) {
  try {
    const {
      fileId,
      filename,
      species,
      plot, // 🆕 from new UI
      sensorId,
      deploymentId,
      experienceId, // still supported if sent
      experiencePoint,
    } = req.body;

    if (!fileId) {
      return res
        .status(400)
        .json({ success: false, error: "fileId is required" });
    }

    // Build item but strip out undefined / empty values to keep DynamoDB happy
    const base = {
      fileId,
      filename,
      species,
      plot,
      sensorId,
      deploymentId,
      experienceId,
      experiencePoint,
      updatedAt: new Date().toISOString(),
    };

    const item: Record<string, any> = {};
    for (const [key, value] of Object.entries(base)) {
      if (
        value !== undefined &&
        value !== null &&
        value !== "" // don't store empty strings unless you want them
      ) {
        item[key] = value;
      }
    }

    await ddb.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: item,
      })
    );

    res.json({ success: true, item });
  } catch (err: any) {
    console.error("❌ Error saving metadata:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Failed to save metadata",
    });
  }
}

/**
 * Get ALL metadata entries
 */
export async function getAllMetadata(_req: Request, res: Response) {
  try {
    const data = await ddb.send(
      new ScanCommand({ TableName: TABLE_NAME })
    );
    res.json({ success: true, items: data.Items || [] });
  } catch (err: any) {
    console.error("❌ Error fetching metadata:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Failed to fetch metadata",
    });
  }
}

/**
 * Get metadata for a single file
 */
export async function getMetadata(req: Request, res: Response) {
  try {
    const { fileId } = req.params;
    if (!fileId) {
      return res
        .status(400)
        .json({ success: false, error: "Missing fileId" });
    }

    const data = await ddb.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { fileId },
      })
    );

    if (!data.Item) {
      return res
        .status(404)
        .json({ success: false, error: "Not found" });
    }

    res.json({ success: true, item: data.Item });
  } catch (err: any) {
    console.error("❌ Error getting metadata:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Failed to get metadata",
    });
  }
}
