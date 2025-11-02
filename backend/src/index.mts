import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import uploadRoutes from "./routes/uploadRoutes.mjs";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.use("/upload", uploadRoutes);

app.get("/", (_req, res) => {
  res.send("Wohooo API is alive!");
});

app.listen(PORT, () => {
  console.log(`API running at http://localhost:${PORT}`);
});
