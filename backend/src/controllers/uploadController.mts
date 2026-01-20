import {
  PutCommand,
  GetCommand,
  ScanCommand,
  DeleteCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import type { Request, Response } from "express";
import { ddb, TABLE_NAME, HIGHLIGHT_TABLE_NAME } from "../aws/dynamo.mjs";
import { deleteObject, getPresignedPutUrl, objectExists } from "../aws/s3.mjs";
import dotenv from "dotenv";

dotenv.config({ quiet: true });

export async function generatePresignedUrl(req: Request, res: Response): Promise<void> {
  try {
    const { filename, contentType, type } = req.body as {
      filename?: string;
      contentType?: string;
      type?: "video" | "thumbnail" | "highlightVideo" | "highlightThumbnail";
    };

    if (!filename || !contentType) {
      res.status(400).json({ success: false, error: "Missing filename or contentType" });
      return;
    }

    const isHighlight = type === "highlightVideo" || type === "highlightThumbnail";
    const bucket = isHighlight
      ? (process.env.AWS_HIGHLIGHT_BUCKET as string) || (process.env.AWS_BUCKET as string)
      : (process.env.AWS_BUCKET as string);

    if (!bucket) {
      res.status(500).json({ success: false, error: "Missing target bucket configuration" });
      return;
    }

    const prefix =
      type === "thumbnail"
        ? "thumbnails"
        : type === "highlightThumbnail"
          ? "highlight/thumbnails"
        : type === "highlightVideo"
            ? "highlight"
            : "uploads";

    const key = `${prefix}/${Date.now()}_${filename}`;

    const params = {
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
      Expires: 300,
    };

    const uploadUrl = await getPresignedPutUrl(params);
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
      highlight,
      displayState,
      trimStartSec,
      trimEndSec,
      highlightThumbnailId,
      id_state,
      highlightFileId,
      stage,
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
      highlight: highlight ?? false,
      displayState: displayState ?? "Inactive",
      stage: stage ?? "draft",
      trimStartSec,
      trimEndSec,
      highlightThumbnailId,
      highlightFileId,
      id_state: id_state ?? "Unknown",
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
    const {
      fileId,
      species,
      plot,
      experiencePoint,
      sensorId,
      deploymentId,
      highlight,
      displayState,
      trimStartSec,
      trimEndSec,
      highlightThumbnailId,
      id_state,
      highlightFileId,
      stage,
    } = req.body as Record<string, any>;

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
      highlight,
      displayState,
      trimStartSec,
      trimEndSec,
      highlightThumbnailId,
      id_state,
      highlightFileId,
      stage,
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

export async function saveHighlightAsset(req: Request, res: Response): Promise<void> {
  try {
    const {
      sourceFileId,
      highlightFileId,
      highlightThumbnailId,
      trimStartSec,
      trimEndSec,
      filename,
      species,
      plot,
      experiencePoint,
      sensorId,
      deploymentId,
      id_state,
    } = req.body as Record<string, any>;

    if (!sourceFileId || !highlightFileId) {
      res.status(400).json({ success: false, error: "sourceFileId and highlightFileId are required" });
      return;
    }

    // Build the highlight item once so we can return it even if it's the same table.
    const highlightBase = {
      highlightId: highlightFileId,
      sourceFileId,
      highlightFileId,
      highlightThumbnailId,
      trimStartSec,
      trimEndSec,
      filename,
      species,
      plot,
      experiencePoint,
      sensorId,
      deploymentId,
      id_state: id_state ?? "Unknown",
      createdAt: new Date().toISOString(),
    };

    const highlightItem: Record<string, any> = {};
    for (const [key, value] of Object.entries(highlightBase)) {
      if (value !== undefined) {
        highlightItem[key] = value;
      }
    }

    // Delete previous highlight assets if we're replacing them
    try {
      const current = await ddb.send(new GetCommand({ TableName: TABLE_NAME, Key: { fileId: sourceFileId } }));
      const prevHighlightFileId = (current.Item as any)?.highlightFileId as string | undefined;
      const prevHighlightThumbnailId = (current.Item as any)?.highlightThumbnailId as string | undefined;
      const targetBucket = (process.env.AWS_HIGHLIGHT_BUCKET as string) || (process.env.AWS_BUCKET as string);
      if (!targetBucket) {
        throw new Error("Missing target bucket configuration");
      }
      const deleteOps: Array<Promise<any>> = [];
      if (prevHighlightFileId && prevHighlightFileId !== highlightFileId) {
        deleteOps.push(
          deleteObject({
            Bucket: targetBucket,
            Key: prevHighlightFileId,
          })
        );
      }
      if (prevHighlightThumbnailId && prevHighlightThumbnailId !== highlightThumbnailId) {
        deleteOps.push(
          deleteObject({
            Bucket: targetBucket,
            Key: prevHighlightThumbnailId,
          })
        );
      }
      if (deleteOps.length) {
        await Promise.allSettled(deleteOps);
      }
    } catch (cleanupErr) {
      console.warn("Highlight cleanup failed or skipped:", cleanupErr);
    }

    // Only write a separate highlight record if the highlight table differs from the base table.
    if (HIGHLIGHT_TABLE_NAME && HIGHLIGHT_TABLE_NAME !== TABLE_NAME) {
      await ddb.send(new PutCommand({ TableName: HIGHLIGHT_TABLE_NAME, Item: highlightItem }));
    }

    const updateResult = await ddb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { fileId: sourceFileId },
        UpdateExpression:
          "SET highlight = :highlight, displayState = :displayState, trimStartSec = :trimStartSec, trimEndSec = :trimEndSec, highlightFileId = :highlightFileId, highlightThumbnailId = :highlightThumbnailId, updatedAt = :updatedAt",
        ExpressionAttributeValues: {
          ":highlight": true,
          ":displayState": "Action",
          ":trimStartSec": trimStartSec,
          ":trimEndSec": trimEndSec,
          ":highlightFileId": highlightFileId,
          ":highlightThumbnailId": highlightThumbnailId ?? null,
          ":updatedAt": new Date().toISOString(),
        },
        ReturnValues: "ALL_NEW",
      })
    );

    res.json({ success: true, item: highlightItem, baseUpdate: updateResult.Attributes });
  } catch (err: unknown) {
    console.error("Error saving highlight asset:", err);
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Failed to save highlight asset",
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

    await deleteObject({
      Bucket: process.env.AWS_BUCKET as string,
      Key: fileId,
    });

    res.json({ success: true, message: "File and metadata deleted" });
  } catch (err: unknown) {
    console.error("Error deleting file and metadata:", err);
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete file and metadata",
    });
  }
}

export async function deleteHighlightAsset(req: Request, res: Response): Promise<void> {
  try {
    const { fileId, highlightFileId, highlightThumbnailId } = req.body as {
      fileId?: string;
      highlightFileId?: string;
      highlightThumbnailId?: string | null;
    };

    if (!fileId) {
      res.status(400).json({ success: false, error: "fileId is required" });
      return;
    }

    const targetBucket = (process.env.AWS_HIGHLIGHT_BUCKET as string) || (process.env.AWS_BUCKET as string);
    if (!targetBucket) {
      res.status(500).json({ success: false, error: "Missing target bucket configuration" });
      return;
    }

    // Delete highlight media assets from S3 if present
    const deleteOps: Array<Promise<any>> = [];
    if (highlightFileId) {
      deleteOps.push(
        deleteObject({
          Bucket: targetBucket,
          Key: highlightFileId,
        })
      );
    }
    if (highlightThumbnailId) {
      deleteOps.push(
        deleteObject({
          Bucket: targetBucket,
          Key: highlightThumbnailId,
        })
      );
    }
    if (deleteOps.length) {
      await Promise.allSettled(deleteOps);
    }

    // Remove highlight row from dedicated table if applicable
    if (HIGHLIGHT_TABLE_NAME && HIGHLIGHT_TABLE_NAME !== TABLE_NAME && highlightFileId) {
      await ddb.send(
        new DeleteCommand({
          TableName: HIGHLIGHT_TABLE_NAME,
          Key: { highlightId: highlightFileId },
        })
      );
    }

    // Reset highlight fields on the base record
    const updateResult = await ddb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { fileId },
        UpdateExpression:
          "SET highlight = :highlight, displayState = :displayState, trimStartSec = :trimStartSec, trimEndSec = :trimEndSec, highlightFileId = :highlightFileId, highlightThumbnailId = :highlightThumbnailId, updatedAt = :updatedAt",
        ExpressionAttributeValues: {
          ":highlight": false,
          ":displayState": "Showcase",
          ":trimStartSec": null,
          ":trimEndSec": null,
          ":highlightFileId": null,
          ":highlightThumbnailId": null,
          ":updatedAt": new Date().toISOString(),
        },
        ReturnValues: "ALL_NEW",
      })
    );

    res.json({ success: true, baseUpdate: updateResult.Attributes });
  } catch (err: unknown) {
    console.error("Error deleting highlight asset:", err);
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete highlight asset",
    });
  }
}

export async function checkHighlightExists(req: Request, res: Response): Promise<void> {
  try {
    const { fileId, highlightFileId } = req.body as {
      fileId?: string;
      highlightFileId?: string;
    };

    if (!fileId && !highlightFileId) {
      res.status(400).json({ success: false, error: "fileId or highlightFileId is required" });
      return;
    }

    let highlightKey = highlightFileId;
    if (!highlightKey && fileId) {
      const current = await ddb.send(new GetCommand({ TableName: TABLE_NAME, Key: { fileId } }));
      highlightKey = (current.Item as any)?.highlightFileId as string | undefined;
    }

    const targetBucket = (process.env.AWS_HIGHLIGHT_BUCKET as string) || (process.env.AWS_BUCKET as string);
    if (!targetBucket) {
      res.status(500).json({ success: false, error: "Missing target bucket configuration" });
      return;
    }

    if (!highlightKey) {
      res.json({ success: true, exists: false, fileId: fileId ?? null });
      return;
    }

    const exists = await objectExists({ Bucket: targetBucket, Key: highlightKey });
    res.json({ success: true, exists, fileId: fileId ?? null, highlightFileId: highlightKey });
  } catch (err: unknown) {
    console.error("Error checking highlight asset:", err);
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Failed to verify highlight asset",
    });
  }
}
