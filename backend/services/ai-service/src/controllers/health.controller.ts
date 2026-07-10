import { Request, Response } from "express";
import { ProviderManager } from "../providers/provider-manager";
import logger from "../utils/logger";
import { ChromaVectorStore } from "../vector/chroma-vector-store";

const vectorStore = new ChromaVectorStore();
const providerManager = new ProviderManager();

export async function health(req: Request, res: Response) {
  const provider = (req.query.provider as string) ?? "ollama";

  const chroma = await vectorStore.health();

  let providerHealthy = false;
  try {
    providerHealthy = await providerManager.health(provider);
  } catch (e) {
    logger.debug("provider health check failed", (e as any)?.message ?? e);
  }

  res.json({ ok: true, chroma, provider: providerHealthy });
}
