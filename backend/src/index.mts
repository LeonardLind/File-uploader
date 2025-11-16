// index.mts
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import "dotenv/config";


import { uploadRoutes } from "./routes/uploadRoutes.mjs";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "100mb" }));

app.use("/api/upload", uploadRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Backend running on port", PORT));
