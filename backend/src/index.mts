import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import uploadRoutes from "./routes/uploadRoutes.mjs";
import iucnRoutes from "./routes/iucnRoutes.mjs";

const envPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", ".env");
dotenv.config({ path: envPath, quiet: true });

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use("/api/upload", uploadRoutes);
app.use("/api/iucn", iucnRoutes);

app.get("/", (_req, res) => {
  res.send("API is alive!");
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
