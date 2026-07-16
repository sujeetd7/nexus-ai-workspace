import { ExecutionEngine } from "../execution/engine/execution-engine";
import { IExecutorRegistry } from "../execution/executor/executor-registry.interface";
import { ExecutorRegistry } from "../execution/executor/executor.registry";
import { LLMExecutor } from "../execution/executor/llm.executor";
import { IKernel, IKernelModule } from "../kernel/kernel-module.interface";
import { CalculatorTool } from "../tools/builtins/calculator.tool";
import { DateTimeTool } from "../tools/builtins/datetime.tool";
import { UUIDTool } from "../tools/builtins/uuid.tool";
import { JsonTool } from "../tools/builtins/json.tool";
import { HttpTool } from "../tools/builtins/http.tool";
import { ToolRegistry } from "../tools/registry/tool-registry";
import { EnhancedToolRegistry } from "../mcp/bridge/enhanced-tool-registry";
import { EnhancedToolExecutor } from "../tools/runtime/enhanced-tool-executor";
import { DocumentExecutor } from "./executor/document.executor";
import { MemoryExecutor } from "./executor/memory.executor";
import { OutputExecutor } from "./executor/output.executor";
import { RagExecutor } from "./executor/rag.executor";
import { ToolExecutionExecutor } from "./executor/tool.executor";
import { ToolCallingExecutor } from "./executor/tool-calling.executor";
import { AIServiceIntegrationModule } from "../integrations/ai-service/ai-service-integration.module";

export class ExecutionModule implements IKernelModule {
  public readonly name = "ExecutionModule";
  private executorRegistry: IExecutorRegistry;
  private executionEngine: ExecutionEngine | undefined;

  constructor() {
    this.executorRegistry = new ExecutorRegistry();
  }

  public async init(kernel: IKernel): Promise<void> {
    console.log("ExecutionModule initialized.");

    // Check if MCP is available
    let toolRegistry: ToolRegistry;
    try {
      const mcpModule = kernel.getModule("MCPModule") as any;
      if (mcpModule && mcpModule.getEnhancedToolRegistry) {
        // Use enhanced registry with MCP support
        const enhancedRegistry = mcpModule.getEnhancedToolRegistry();
        toolRegistry = enhancedRegistry.getBuiltinRegistry();
        console.log("Using enhanced tool registry with MCP support");
      } else {
        throw new Error("MCP not available");
      }
    } catch (error) {
      // Fall back to basic registry
      toolRegistry = new ToolRegistry();
      console.log("Using basic tool registry (MCP not available)");
    }
    
    const toolExecutor = new EnhancedToolExecutor(toolRegistry);

    // Register built-in tools
    toolRegistry.register(new CalculatorTool());
    toolRegistry.register(new DateTimeTool());
    toolRegistry.register(new UUIDTool());
    toolRegistry.register(new JsonTool());
    toolRegistry.register(new HttpTool());

    // Register executors
    this.executorRegistry.registerExecutor("memory", new MemoryExecutor());

    this.executorRegistry.registerExecutor(
      "document",
      new DocumentExecutor(kernel),
    );

    this.executorRegistry.registerExecutor(
      "tool",
      new ToolExecutionExecutor(toolRegistry),
    );

    this.executorRegistry.registerExecutor("rag", new RagExecutor());

    this.executorRegistry.registerExecutor("llm", new LLMExecutor(kernel));

    // Register tool-calling executor
    const aiServiceModule = kernel.getModule<AIServiceIntegrationModule>("AIServiceIntegrationModule");
    if (aiServiceModule) {
      const aiServiceClient = aiServiceModule.getClient();
      this.executorRegistry.registerExecutor(
        "tool_calling",
        new ToolCallingExecutor(aiServiceClient, toolRegistry, toolExecutor)
      );
    }

    this.executorRegistry.registerExecutor("output", new OutputExecutor());

    // Initialize the ExecutionEngine with the registry and a default scheduler
    this.executionEngine = new ExecutionEngine(this.executorRegistry);
  }

  public async dispose(): Promise<void> {
    console.log("ExecutionModule disposed.");
    // Clean up resources if necessary
  }

  public getExecutionEngine(): ExecutionEngine {
    if (!this.executionEngine) {
      throw new Error("ExecutionEngine not initialized. Call init() first.");
    }
    return this.executionEngine;
  }

  public getExecutorRegistry(): IExecutorRegistry {
    return this.executorRegistry;
  }
}
