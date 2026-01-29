import {
  PutCommand,
  GetCommand,
  ScanCommand,
  DeleteCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import type { Request, Response } from "express";
import { ddb, TABLE_NAME, HIGHLIGHT_TABLE_NAME, CAMERA_METADATA_TABLE_NAME } from "../aws/dynamo.mjs";
import { deleteObject, getPresignedGetUrl, getPresignedPutUrl, objectExists } from "../aws/s3.mjs";
import dotenv from "dotenv";

dotenv.config({ quiet: true });

const DEFAULT_IUCN_BASE_URL = "https://api.iucnredlist.org/api/v4";
const IUCN_REQUEST_TIMEOUT_MS = 8000;
const IUCN_CATEGORY_LABELS: Record<string, string> = {
  EX: "Extinct",
  EW: "Extinct in the Wild",
  RE: "Regionally Extinct",
  CR: "Critically Endangered",
  EN: "Endangered",
  VU: "Vulnerable",
  NT: "Near Threatened",
  LC: "Least Concern",
  DD: "Data Deficient",
  NE: "Not Evaluated",
};

type IucnCommonName = {
  name?: string;
  language?: string;
  main?: boolean;
};

type IucnTaxon = {
  sis_id?: number;
  scientific_name?: string;
  common_names?: IucnCommonName[];
  class_name?: string;
  genus_name?: string;
  species_name?: string;
  infra_name?: string | null;
};

type IucnScientificResponse = {
  taxon?: IucnTaxon;
};

type IucnAssessment = {
  year_published?: string;
  latest?: boolean;
  red_list_category_code?: string;
  url?: string;
};

type IucnSisResponse = {
  taxon?: IucnTaxon;
  assessments?: IucnAssessment[];
};

type IucnSummary = {
  common_name?: string | null;
  class_name?: string | null;
  red_list_category_code?: string | null;
  red_list_category_label?: string | null;
  assessment_year?: string | null;
  assessment_url?: string | null;
  sis_id?: number | null;
};

const IUCN_CACHE = new Map<string, IucnSummary>();

const normalizeSpeciesName = (value: string) => value.trim().replace(/\s+/g, " ");

const pickCommonName = (commonNames?: IucnCommonName[]) => {
  if (!Array.isArray(commonNames) || commonNames.length === 0) return "";
  const mainEng = commonNames.find((name) => name.main && name.language === "eng");
  if (mainEng?.name) return mainEng.name;
  const anyEng = commonNames.find((name) => name.language === "eng");
  if (anyEng?.name) return anyEng.name;
  return commonNames[0]?.name ?? "";
};

const pickLatestAssessment = (assessments?: IucnAssessment[]) => {
  if (!Array.isArray(assessments) || assessments.length === 0) return null;
  const latest = assessments.find((assessment) => assessment.latest);
  if (latest) return latest;
  const sorted = [...assessments].sort((a, b) => {
    const yearA = Number(a.year_published) || 0;
    const yearB = Number(b.year_published) || 0;
    return yearB - yearA;
  });
  return sorted[0] ?? null;
};

const parseScientificName = (scientificName: string) => {
  const parts = normalizeSpeciesName(scientificName).split(/\s+/).filter(Boolean);
  if (parts.length < 2) return null;
  const [genusName, speciesName, ...rest] = parts;
  const infraName = rest.length ? rest.join(" ") : "";
  return { genusName, speciesName, infraName };
};

const fetchIucnJson = async (url: string, token: string) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), IUCN_REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "File-Uploader/1.0",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json().catch(() => ({}));
    return { response, data };
  } finally {
    clearTimeout(timeout);
  }
};

const fetchIucnSummary = async (scientificName: string): Promise<IucnSummary | null> => {
  const token = process.env.IUCN_API_TOKEN?.trim();
  if (!token) return null;

  const normalized = normalizeSpeciesName(scientificName);
  const cacheKey = normalized.toLowerCase();
  const cached = IUCN_CACHE.get(cacheKey);
  if (cached) return cached;

  const parsed = parseScientificName(normalized);
  if (!parsed) return null;

  const baseUrl = (process.env.IUCN_API_BASE_URL || DEFAULT_IUCN_BASE_URL).trim().replace(/\/$/, "");

  try {
    const scientificUrl = new URL(`${baseUrl}/taxa/scientific_name`);
    scientificUrl.searchParams.set("genus_name", parsed.genusName);
    scientificUrl.searchParams.set("species_name", parsed.speciesName);
    if (parsed.infraName) scientificUrl.searchParams.set("infra_name", parsed.infraName);

    const scientificResult = await fetchIucnJson(scientificUrl.toString(), token);
    if (scientificResult.response.status === 404) return null;
    if (!scientificResult.response.ok) {
      console.warn("IUCN scientific name lookup failed", {
        status: scientificResult.response.status,
        species: normalized,
      });
      return null;
    }

    const scientificData = scientificResult.data as IucnScientificResponse;
    const taxon = scientificData?.taxon;
    if (!taxon) return null;

    const sisId = taxon.sis_id ?? null;
    const summary: IucnSummary = {
      common_name: pickCommonName(taxon.common_names) || null,
      class_name: taxon.class_name ?? null,
      sis_id: sisId,
      red_list_category_code: null,
      red_list_category_label: null,
      assessment_year: null,
      assessment_url: null,
    };

    if (!sisId) {
      IUCN_CACHE.set(cacheKey, summary);
      return summary;
    }

    const sisUrl = `${baseUrl}/taxa/sis/${sisId}`;
    const sisResult = await fetchIucnJson(sisUrl, token);
    if (!sisResult.response.ok) {
      console.warn("IUCN sis lookup failed", {
        status: sisResult.response.status,
        sisId,
        species: normalized,
      });
      IUCN_CACHE.set(cacheKey, summary);
      return summary;
    }

    const sisData = sisResult.data as IucnSisResponse;
    const latestAssessment = pickLatestAssessment(sisData?.assessments);
    if (latestAssessment) {
      const code = latestAssessment.red_list_category_code ?? null;
      summary.red_list_category_code = code;
      summary.red_list_category_label = code ? IUCN_CATEGORY_LABELS[code] || null : null;
      summary.assessment_year = latestAssessment.year_published ?? null;
      summary.assessment_url = latestAssessment.url ?? null;
    }

    IUCN_CACHE.set(cacheKey, summary);
    return summary;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      console.warn("IUCN request timed out", { species: normalized });
      return null;
    }
    console.warn("IUCN request failed", { species: normalized, error: err });
    return null;
  }
};

const mapWithConcurrency = async <T, R>(
  items: T[],
  limit: number,
  mapper: (item: T, index: number) => Promise<R>
) => {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;
  const workerCount = Math.min(limit, items.length);
  const workers = Array.from({ length: workerCount }, async () => {
    while (true) {
      const currentIndex = nextIndex++;
      if (currentIndex >= items.length) return;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  });
  await Promise.all(workers);
  return results;
};

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

export async function generatePresignedGetUrl(req: Request, res: Response): Promise<void> {
  try {
    const { key, type, expiresIn, responseContentType } = req.body as {
      key?: string;
      type?: "default" | "highlight";
      expiresIn?: number;
      responseContentType?: string;
    };

    if (!key) {
      res.status(400).json({ success: false, error: "Missing key" });
      return;
    }

    const bucket =
      type === "highlight"
        ? (process.env.AWS_HIGHLIGHT_BUCKET as string) || (process.env.AWS_BUCKET as string)
        : (process.env.AWS_BUCKET as string);

    if (!bucket) {
      res.status(500).json({ success: false, error: "Missing target bucket configuration" });
      return;
    }

    const expires = typeof expiresIn === "number" && expiresIn > 0 ? expiresIn : 300;

    const signedUrl = await getPresignedGetUrl({
      Bucket: bucket,
      Key: key,
      Expires: expires,
      ResponseContentType: responseContentType,
    });

    res.json({ success: true, url: signedUrl, key });
  } catch (err: unknown) {
    console.error("Error generating presigned GET URL:", err);
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

export async function getCameraMetadata(req: Request, res: Response): Promise<void> {
  try {
    const { cameraId } = req.params;
    if (!cameraId) {
      res.status(400).json({ success: false, error: "Missing cameraId" });
      return;
    }

    if (!CAMERA_METADATA_TABLE_NAME) {
      res.status(500).json({ success: false, error: "Camera metadata table is not configured" });
      return;
    }

    const data = await ddb.send(
      new GetCommand({
        TableName: CAMERA_METADATA_TABLE_NAME,
        Key: { cameraId },
      })
    );

    if (!data.Item) {
      res.status(404).json({ success: false, error: "Not found" });
      return;
    }

    res.json({ success: true, item: data.Item });
  } catch (err: unknown) {
    console.error("Error getting camera metadata:", err);
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Failed to get camera metadata",
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

export async function getConfirmedSpeciesSummary(_req: Request, res: Response): Promise<void> {
  try {
    const confirmedItems: Array<Record<string, any>> = [];
    let lastEvaluatedKey: Record<string, any> | undefined;

    do {
      const data = await ddb.send(
        new ScanCommand({
          TableName: TABLE_NAME,
          ProjectionExpression: "#species, #id_state",
          FilterExpression: "#id_state = :confirmed",
          ExpressionAttributeNames: {
            "#species": "species",
            "#id_state": "id_state",
          },
          ExpressionAttributeValues: {
            ":confirmed": "Confirmed",
          },
          ExclusiveStartKey: lastEvaluatedKey,
        })
      );
      if (data.Items) confirmedItems.push(...data.Items);
      lastEvaluatedKey = data.LastEvaluatedKey as Record<string, any> | undefined;
    } while (lastEvaluatedKey);

    const summaryMap = new Map<string, { species: string; count: number }>();
    for (const item of confirmedItems) {
      if (typeof item.species !== "string") continue;
      const normalized = normalizeSpeciesName(item.species);
      if (!normalized) continue;
      const key = normalized.toLowerCase();
      const existing = summaryMap.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        summaryMap.set(key, { species: normalized, count: 1 });
      }
    }

    const entries = Array.from(summaryMap.values()).sort((a, b) =>
      a.species.localeCompare(b.species)
    );
    const iucnDetails = await mapWithConcurrency(entries, 4, async (entry) => {
      const details = await fetchIucnSummary(entry.species);
      return details || {};
    });

    const items = entries.map((entry, index) => ({
      ...entry,
      ...iucnDetails[index],
    }));

    res.json({ success: true, count: items.length, items });
  } catch (err: unknown) {
    console.error("Error building confirmed species summary:", err);
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Failed to build species summary",
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
