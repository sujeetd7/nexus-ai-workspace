import { AIServiceClient } from "../clients/ai-service.client";
import { PromptCompiler } from "../compiler/prompt-compiler";

import {
  ExecutePromptDto,
  PlaygroundPromptDto,
  RollbackPromptDto,
} from "../dto/prompt.dto";

import { PromptExecutionRepository } from "../repositories/prompt-execution.repository";
import { PromptVersionRepository } from "../repositories/prompt-version.repository";
import { PromptRepository } from "../repositories/prompt.repository";

export class PromptService {
  private readonly promptRepository = new PromptRepository();

  private readonly versionRepository = new PromptVersionRepository();

  private readonly executionRepository = new PromptExecutionRepository();

  private readonly compiler = new PromptCompiler();

  private readonly aiClient = new AIServiceClient();

  async createPrompt(data: any) {
    return this.promptRepository.create(data);
  }

  async createVersion(data: any) {
    const payload = { ...data };

    if (typeof payload.content === "string") {
      try {
        const parsed = JSON.parse(payload.content);

        payload.systemPrompt =
          parsed.systemPrompt ??
          parsed.system ??
          parsed.system_prompt ??
          payload.systemPrompt;

        payload.userPrompt =
          parsed.userPrompt ??
          parsed.user ??
          parsed.user_prompt ??
          payload.userPrompt;
      } catch {
        payload.userPrompt = payload.content;
      }

      delete payload.content;
    }

    return this.versionRepository.create(payload);
  }

  async execute(data: any) {
    return this.executionRepository.create({
      promptVersionId: data.promptVersionId,
      input: data.input,
      output: {
        response: "Mock LLM Response",
      },
      tokens: 100,
      latency: 250,
    });
  }

  async executePublished(dto: ExecutePromptDto) {
    const fallbackMode = (
      process.env.PROMPT_FALLBACK_MODE ?? "none"
    ).toLowerCase();

    const autoPublish =
      (process.env.PROMPT_FALLBACK_AUTO_PUBLISH ?? "false").toLowerCase() ===
      "true";

    let version = await this.versionRepository.findPublished(dto.promptId);

    if (!version) {
      if (fallbackMode === "latest") {
        version = await this.versionRepository.latest(dto.promptId);

        if (version) {
          console.warn(
            `No published version found. Using latest version ${version.version}.`,
          );

          if (autoPublish) {
            version = await this.versionRepository.publish(version.id);
          }
        }
      }
    }

    if (!version) {
      throw new Error("No published version found.");
    }

    const validation = this.compiler.validate(
      `${version.systemPrompt ?? ""}

${version.userPrompt ?? ""}`,
      dto.variables,
    );

    if (!validation.valid) {
      throw new Error(`Missing variables: ${validation.missing.join(", ")}`);
    }

    const systemPrompt = this.compiler.compile(
      version.systemPrompt ?? "",
      dto.variables,
    );

    const userPrompt = this.compiler.compile(
      version.userPrompt ?? "",
      dto.variables,
    );

    const result = await this.aiClient.execute({
      provider: version.provider ?? process.env.DEFAULT_PROVIDER ?? "ollama",

      model: version.model ?? process.env.DEFAULT_MODEL,

      systemPrompt,

      prompt: userPrompt,
    });

    await this.executionRepository.create({
      promptVersionId: version.id,
      input: dto.variables,
      output: result,
      tokens: result.totalTokens,
      latency: result.durationMs,
    });

    return result;
  }

  async rollback(dto: RollbackPromptDto) {
    const version = await this.versionRepository.findByPromptAndVersion(
      dto.promptId,
      dto.version,
    );

    if (!version) {
      throw new Error("Version not found.");
    }

    await this.versionRepository.unpublishAll(dto.promptId);

    const published = await this.versionRepository.publish(version.id);

    return {
      success: true,
      version: published.version,
      published: true,
    };
  }

  async publish(versionId: string) {
    return this.versionRepository.publish(versionId);
  }

  async executePrompt(
    promptVersion: {
      id: string;
      systemPrompt?: string | null;
      userPrompt?: string | null;
      provider?: string | null;
      model?: string | null;
    },
    variables: Record<string, unknown>,
  ) {
    const validation = this.compiler.validate(
      `${promptVersion.systemPrompt ?? ""}

${promptVersion.userPrompt ?? ""}`,
      variables,
    );

    if (!validation.valid) {
      throw new Error(`Missing variables: ${validation.missing.join(", ")}`);
    }

    const systemPrompt = this.compiler.compile(
      promptVersion.systemPrompt ?? "",
      variables,
    );

    const userPrompt = this.compiler.compile(
      promptVersion.userPrompt ?? "",
      variables,
    );

    const response = await this.aiClient.execute({
      provider:
        promptVersion.provider ?? process.env.DEFAULT_PROVIDER ?? "ollama",

      model: promptVersion.model ?? process.env.DEFAULT_MODEL,

      systemPrompt,
      prompt: userPrompt,
    });

    await this.executionRepository.create({
      promptVersionId: promptVersion.id,
      input: variables,
      output: response,
      latency: response.durationMs,
      tokens: response.totalTokens,
    });

    return response;
  }

  async playground(dto: PlaygroundPromptDto) {
    const version = await this.versionRepository.findById(dto.versionId);

    if (!version) {
      throw new Error("Prompt version not found.");
    }

    return this.executePrompt(version, dto.variables);
  }

  async variables(versionId: string) {
    const version = await this.versionRepository.findById(versionId);

    if (!version) {
      throw new Error("Version not found.");
    }

    return {
      variables: this.compiler.extract(
        `${version.systemPrompt ?? ""}

${version.userPrompt ?? ""}`,
      ),
    };
  }

  async executionHistory() {
    return this.executionRepository.findAll();
  }

  async executionDetails(id: string) {
    const execution = await this.executionRepository.findById(id);

    if (!execution) {
      throw new Error("Execution not found.");
    }

    return execution;
  }

  async executionHistoryByPrompt(promptId: string) {
    return this.executionRepository.findByPrompt(promptId);
  }

  async list() {
    return this.promptRepository.findAll();
  }

  async get(id: string) {
    const prompt = await this.promptRepository.findById(id);

    if (!prompt) {
      throw new Error("Prompt not found.");
    }

    return prompt;
  }

  async delete(id: string) {
    await this.promptRepository.delete(id);

    return {
      success: true,
      message: "Prompt deleted successfully.",
    };
  }
}
