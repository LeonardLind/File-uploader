// controller/uploadController.mts

import type { Request, Response } from "express";

import { presignUpload } from "../services/s3Service.mjs";
import {
  saveMetadata,
  deleteMetadata,
  getAllMetadata,
  toDynamo,
  buildMetadataEntry,
} from "../services/uploadService.mjs";
import { success, failure } from "../utils/response.mjs";


// -----------------------------
// PRESIGN UPLOAD
// -----------------------------
export async function presignUploadController(req: Request, res: Response) {
  try {
    const { filename, contentType } = req.body;

    const key = `${Date.now()}_${filename}`;
    const url = await presignUpload(key, contentType);

    return res.json(success("Presigned URL generated", { uploadUrl: url, key }));
  } catch (err) {
    const { status, payload } = failure("Failed to presign upload", err, 400);
    return res.status(status).json(payload);
    
  }
  
}


// -----------------------------
// CREATE METADATA
// -----------------------------
export async function createMetadataController(req: Request, res: Response) {
  try {
    const entry = buildMetadataEntry(req.body);
    await saveMetadata(toDynamo(entry));

    return res.json(success("Metadata saved", entry));
  } catch (err) {
    const { status, payload } = failure("Failed to save metadata", err, 500);
    return res.status(status).json(payload);
  }
}


// -----------------------------
// DELETE FILE METADATA
// -----------------------------
export async function deleteFileController(req: Request, res: Response) {
  try {
    const fileId = req.params.fileId as string;

    await deleteMetadata(fileId);

    return res.json(success("Deleted", { fileId }));
  } catch (err) {
    const { status, payload } = failure("Failed to delete", err, 500);
    return res.status(status).json(payload);
  }
}


// -----------------------------
// LIST ALL METADATA
// -----------------------------
export async function listMetadataController(req: Request, res: Response) {
  try {
    const items = await getAllMetadata();
    return res.json(success("Fetched metadata", items));
    } catch (err) {
    console.error("🔥 ERROR in listMetadataController:", err);
    const { status, payload } = failure("Failed to fetch metadata", err, 500);
    return res.status(status).json(payload);
  }

}
