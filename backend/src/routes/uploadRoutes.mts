import express from "express";
import multer from "multer";
import { uploadFile } from "../controllers/uploadController.mjs";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() }); // keep file in memory for S3 upload

router.post("/", upload.single("file"), uploadFile);

export default router;
