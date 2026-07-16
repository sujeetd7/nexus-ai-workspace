import { Request, Response } from "express";
import { ProviderFactory } from "../providers/provider.factory";
import logger from "../utils/logger";
import { ChromaVectorStore } from "../vector/chroma-vector-store";

const vectorStore = new ChromaVectorStore();

export async function health(req: Request, res: Response) {
  const provider = (req.query.provider as string) ?? "ollama";

  const chroma = await vectorStore.health();

  let providerHealthy = false;
  try {
    const aiProvider = ProviderFactory.create(provider);
    providerHealthy = await aiProvider.health();
  } catch (e) {
    logger.debug("provider health check failed", (e as any)?.message ?? e);
  }

  res.json({ ok: true, chroma, provider: providerHealthy });
}
