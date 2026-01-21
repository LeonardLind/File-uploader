import express from "express";
import { searchScientificName } from "../controllers/iucnController.mjs";

const router = express.Router();

router.get("/scientific-name", searchScientificName);
router.get("/common-name", searchScientificName);

export default router;
