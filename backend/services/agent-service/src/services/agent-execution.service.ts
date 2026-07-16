import { NotFoundError } from "../errors/not-found-error";

import { AgentRuntimeRepository } from "../repositories/agent-execution.repository";
import { AgentRepository } from "../repositories/agent.repository";

import { AIKernelClient } from "../clients/ai-kernel.client";

export class AgentRuntimeService {
  private readonly agents = new AgentRepository();

  private readonly runtimes = new AgentRuntimeRepository();

  private readonly kernel = new AIKernelClient();

  async execute(data: { agentId: string; variables: Record<string, unknown> }) {
    try {
      console.log(
        "[SERVICE] Execute request data:",
        JSON.stringify(data, null, 2),
      );

      // Step 1: Find agent by ID
      console.log("[SERVICE] Finding agent with ID:", data.agentId);
      const agent = await this.agents.findById(data.agentId);

      if (!agent) {
        console.log("[SERVICE] Agent not found for ID:", data.agentId);
        throw new NotFoundError("Agent not found.");
      }

      console.log("[SERVICE] Found agent:", JSON.stringify(agent, null, 2));

      // Check if agent model is available, suggest fallback if needed
      if (agent.model === "qwen2.5-coder:1.5b") {
        console.log(
          "[SERVICE] WARNING: Agent is configured to use qwen2.5-coder:1.5b which may not be available",
        );
        console.log(
          "[SERVICE] Consider using a more common model like 'llama3' or 'llama2'",
        );
      }

      // Step 2: Interpolate prompt
      console.log(
        "[SERVICE] Interpolating prompt with variables:",
        data.variables,
      );
      const prompt = this.interpolate(agent.systemPrompt ?? "", data.variables);
      console.log("[SERVICE] Compiled prompt:", prompt);

      // Step 3: Prepare kernel payload with model fallback
      let modelToUse = agent.model;

      // Fallback for problematic models
      const fallbackModels = {
        "qwen2.5-coder:1.5b": "gemma:2b",
        "qwen2.5-coder": "gemma:2b",
      };

      if (fallbackModels[agent.model]) {
        modelToUse = fallbackModels[agent.model];
        console.log(
          `[SERVICE] Using fallback model: ${agent.model} -> ${modelToUse}`,
        );
      }

      const kernelPayload = {
        provider: agent.provider,
        model: modelToUse,
        systemPrompt: prompt,
        prompt,
        temperature: agent.temperature,
      };
      console.log(
        "[SERVICE] Kernel payload:",
        JSON.stringify(kernelPayload, null, 2),
      );

      // Step 4: Call AI Kernel
      console.log("[SERVICE] Calling AI Kernel...");
      const result = await this.kernel.execute(kernelPayload);
      console.log(
        "[SERVICE] AI Kernel response:",
        JSON.stringify(result, null, 2),
      );

      // Step 5: Verify kernel response structure
      if (!result) {
        throw new Error("AI Kernel returned null/undefined result");
      }

      console.log("[SERVICE] Kernel result keys:", Object.keys(result));
      console.log("[SERVICE] Result output type:", typeof result.output);
      console.log("[SERVICE] Result latency:", result.latency);
      console.log("[SERVICE] Result tokens:", result.tokens);

      // Step 6: Prepare runtime data
      const runtimeData = {
        agentId: agent.id,
        provider: agent.provider,
        model: agent.model,
        input: data.variables,
        output: result.output,
        latency: result.latency,
        tokens: result.tokens,
        status: "SUCCESS",
      };
      console.log(
        "[SERVICE] Runtime data to save:",
        JSON.stringify(runtimeData, null, 2),
      );

      // Step 7: Save to database
      console.log("[SERVICE] Saving execution to database...");
      const savedRuntime = await this.runtimes.create(runtimeData);
      console.log(
        "[SERVICE] Saved runtime:",
        JSON.stringify(savedRuntime, null, 2),
      );

      return savedRuntime;
    } catch (error) {
      console.error("[SERVICE] ERROR in execute:", error);
      console.error(
        "[SERVICE] Stack trace:",
        error instanceof Error ? error.stack : "No stack trace",
      );
      throw error;
    }
  }

  async history() {
    return this.runtimes.findAll();
  }

  async historyByAgent(agentId: string) {
    return this.runtimes.findByAgent(agentId);
  }

  async execution(id: string) {
    const runtime = await this.runtimes.findById(id);

    if (!runtime) {
      throw new NotFoundError("Execution not found.");
    }

    return runtime;
  }

  private interpolate(template: string, variables: Record<string, unknown>) {
    return template.replace(/\{\{(.*?)\}\}/g, (_, key) =>
      String(variables[key.trim()] ?? ""),
    );
  }
}
