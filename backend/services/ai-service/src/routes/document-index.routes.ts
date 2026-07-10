import { Router } from "express";

import {
  deleteDocument,
  indexDocument,
  indexStats,
  reindexDocument,
} from "../controllers/document-index.controller";

const router = Router();

router.post("/index", indexDocument);
router.post("/reindex", reindexDocument);
router.post("/delete", deleteDocument);
router.post("/stats", indexStats);

export default router;
