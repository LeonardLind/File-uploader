// routes/uploadRoutes.mts
import { Router } from "express";

import {
  presignUploadController,
  createMetadataController,
  deleteFileController,
  listMetadataController,
} from "../controllers/uploadController.mjs";

export const uploadRoutes = Router();

uploadRoutes.post("/presign", presignUploadController);
uploadRoutes.post("/metadata", createMetadataController);
uploadRoutes.get("/metadata", listMetadataController);
uploadRoutes.delete("/delete/:fileId", deleteFileController);
