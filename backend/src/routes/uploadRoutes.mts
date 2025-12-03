import express from "express";
import {
  generatePresignedUrl,
  saveMetadata,
  getAllMetadata,
  getMetadata,
  updateMetadata, 
  deleteFileAndMetadata, 
  saveHighlightAsset,
  deleteHighlightAsset,
} from "../controllers/uploadController.mjs";

const router = express.Router();

// Generate pre-signed S3 URL for direct uploads
router.post("/presign", generatePresignedUrl);

// Metadata endpoints
router.post("/metadata", saveMetadata);
router.get("/metadata", getAllMetadata);
router.get("/metadata/:fileId", getMetadata);

// Update metadata
router.put("/metadata/update", updateMetadata);

// Save highlight asset (trim + thumbnail) to highlight bucket/table
router.post("/highlight", saveHighlightAsset);
router.post("/highlight/delete", deleteHighlightAsset);

// Delete metadata + S3 file
router.delete("/delete", deleteFileAndMetadata);

export default router;
