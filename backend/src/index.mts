import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import uploadRoutes from "./routes/uploadRoutes.mjs";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/upload", uploadRoutes);

app.get("/", (_req, res) => {
  res.send("API is alive!");
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
