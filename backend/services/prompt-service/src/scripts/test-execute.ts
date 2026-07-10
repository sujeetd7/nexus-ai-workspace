import dotenv from "dotenv";

import { AIServiceClient } from "../clients/ai-service.client";
import { PromptCompiler } from "../compiler/prompt-compiler";

dotenv.config();

async function main() {
  const compiler = new PromptCompiler();

  const client = new AIServiceClient();

  const systemPrompt = compiler.compile("You are a senior architect.", {});

  const userPrompt = compiler.compile("Explain {{topic}}", {
    topic: "RAG",
  });

  const result = await client.execute({
    provider: "openai",
    systemPrompt,
    prompt: userPrompt,
  });

  console.log(result);
}

main().catch(console.error);
