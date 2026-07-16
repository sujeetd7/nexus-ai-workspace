import { ExecuteAIDto } from "../dto/execute-ai.dto";
import { RagQueryDto } from "../dto/rag-query.dto";
import { RagResponseDto } from "../dto/rag-response.dto";

import { AIOrchestrator } from "../orchestrators/ai-orchestrator";

import { VectorService } from "./vector.service";

import { CitationBuilder } from "../rag/citation-builder";
import { ContextBuilder } from "../rag/context-builder";
import { PromptBuilder } from "../utils/prompt-builder";

export class RagService {
  private readonly vectorService = new VectorService();

  private readonly orchestrator = new AIOrchestrator();

  async query(dto: RagQueryDto): Promise<RagResponseDto> {
    // Step 1
    const searchResults = await this.vectorService.search({
      workspaceId: dto.workspaceId,
      provider: dto.provider,
      model: dto.model,
      query: dto.question,
      limit: dto.topK ?? 5,
    });

    // Step 2
    const context = ContextBuilder.build(searchResults);

    const documents = searchResults.filter((doc) => {
      if (!dto.metadata) return true;

      return Object.entries(dto.metadata).every(
        ([k, v]) => doc.metadata?.[k] === v,
      );
    });

    // Step 3
    const prompt = PromptBuilder.buildRAGPrompt(dto.question, context);

    // Step 4
    const response = await this.orchestrator.execute({
      workspaceId: dto.workspaceId,
      userId: "system",
      provider: dto.provider,
      model: dto.model,
      prompt,
    } as ExecuteAIDto);

    // Step 5
    return {
      answer: response.text,

      provider: response.provider,

      model: response.model,

      citations: CitationBuilder.build(documents),
      documents,
    };
  }
}
