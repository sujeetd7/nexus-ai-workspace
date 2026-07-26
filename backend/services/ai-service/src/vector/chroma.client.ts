import { ChromaClient } from "chromadb";
import logger from "../utils/logger";

const CHROMA_URL = process.env.CHROMA_URL || "http://localhost:8000";
if (!process.env.CHROMA_URL) {
  logger.warn("CHROMA_URL not set; defaulting to http://localhost:8000");
}

export const chromaClient = new ChromaClient({
  path: CHROMA_URL,
});
