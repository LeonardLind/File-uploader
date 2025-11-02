import type { Request, Response } from "express";
import { s3, BUCKET } from "../config/s3.mjs";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import crypto from "crypto";

export async function uploadFile(req: Request, res: Response) {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // generate unique filename
    const key = `uploads/${crypto.randomUUID()}-${file.originalname}`;

    const uploadParams = {
      Bucket: BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    };

    await s3.send(new PutObjectCommand(uploadParams));

    const fileUrl = `https://${BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    res.json({
      message: "Upload successful",
      fileUrl,
      fileName: file.originalname,
      size: file.size,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Upload failed" });
  }
}
