import express from "express";
import { searchScientificName } from "../controllers/iucnController.mjs";
import { searchInaturalist } from "../controllers/inatController.mjs";

const router = express.Router();

router.get("/scientific-name", searchScientificName);
router.get("/common-name", searchScientificName);
router.get("/inat-autocomplete", searchInaturalist);

export default router;
