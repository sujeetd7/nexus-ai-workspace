import { NotFoundError } from "../errors/not-found-error";

import { AgentRuntimeRepository } from "../repositories/agent-execution.repository";
import { AgentRepository } from "../repositories/agent.repository";

import { AIKernelClient } from "../clients/ai-kernel.client";

export class AgentRuntimeService {
  private readonly agents = new AgentRepository();

  private readonly runtimes = new AgentRuntimeRepository();

  private readonly kernel = new AIKernelClient();

  async execute(data: { agentId: string; variables: Record<string, unknown> }) {
    const agent = await this.agents.findById(data.agentId);

    if (!agent) {
      throw new NotFoundError("Agent not found.");
    }

    const prompt = this.interpolate(agent.systemPrompt ?? "", data.variables);

    const kernelPayload = {
      provider: agent.provider,
      model: agent.model,
      systemPrompt: prompt,
      prompt,
      temperature: agent.temperature,
    };

    // Let kernel errors propagate — no mock fallback.
    // If the kernel is unreachable or the provider fails, persist a FAILED execution
    // and rethrow so the HTTP layer returns a real error response.
    let result: Awaited<ReturnType<AIKernelClient["execute"]>>;
    try {
      result = await this.kernel.execute(kernelPayload);
    } catch (kernelError: any) {
      await this.runtimes.create({
        agentId: agent.id,
        provider: agent.provider,
        model: agent.model,
        input: data.variables,
        output: null,
        latency: 0,
        tokens: 0,
        status: "FAILED",
        error: kernelError?.message ?? "AI Kernel unreachable",
      });
      throw kernelError;
    }

    return this.runtimes.create({
      agentId: agent.id,
      provider: agent.provider,
      model: agent.model,
      input: data.variables,
      output: result.output,
      latency: result.latency,
      tokens: result.tokens,
      status: "SUCCESS",
    });
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
