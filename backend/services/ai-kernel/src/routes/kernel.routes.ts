import { Router } from "express";
import { AgentIntegrationModule } from "../integrations/agent/agent-integration.module";
import { ChatIntegrationModule } from "../integrations/chat/chat-integration.module";
import { DocumentIntegrationModule } from "../integrations/document/document-integration.module";
import { PromptIntegrationModule } from "../integrations/prompt/prompt-integration.module";
import { WorkspaceIntegrationModule } from "../integrations/workspace/workspace-integration.module";
import { getKernel } from "../kernel/kernel.factory";
import { ToolRegistry } from "../tools/registry/tool-registry";
import { CalculatorTool } from "../tools/builtins/calculator.tool";
import { DateTimeTool } from "../tools/builtins/datetime.tool";

const router = Router();

router.post("/execute", async (req, res) => {
  try {
    const kernel = await getKernel();

    const result = await kernel.execute(req.body);

    res.json(result);
  } catch (error: any) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.get("/health", async (_req, res) => {
  try {
    const kernel = await getKernel();

    const agentModule = kernel.getModule<AgentIntegrationModule>(
      "AgentIntegrationModule",
    );

    const client = agentModule.getClient();
    const healthy = await client.health();

    res.json({ healthy });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/agents/execute", async (req, res) => {
  try {
    const kernel = await getKernel();
    const agentModule = kernel.getModule<AgentIntegrationModule>(
      "AgentIntegrationModule",
    );
    const client = agentModule.getClient();

    const result = await client.execute(req.body);
    res.json(result);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/agents/executions", async (_req, res) => {
  try {
    const kernel = await getKernel();
    const agentModule = kernel.getModule<AgentIntegrationModule>(
      "AgentIntegrationModule",
    );
    const client = agentModule.getClient();

    const result = await client.listExecutions();
    res.json(result);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/agents/execution/:executionId", async (req, res) => {
  try {
    const kernel = await getKernel();
    const agentModule = kernel.getModule<AgentIntegrationModule>(
      "AgentIntegrationModule",
    );
    const client = agentModule.getClient();

    const result = await client.getExecution(req.params.executionId);
    res.json(result);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/agents", async (req, res) => {
  try {
    const kernel = await getKernel();
    const agentModule = kernel.getModule<AgentIntegrationModule>(
      "AgentIntegrationModule",
    );
    const client = agentModule.getClient();

    const result = await client.createAgent(req.body);
    res.json(result);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/agents", async (_req, res) => {
  try {
    const kernel = await getKernel();
    const agentModule = kernel.getModule<AgentIntegrationModule>(
      "AgentIntegrationModule",
    );
    const client = agentModule.getClient();

    const result = await client.listAgents();
    res.json(result);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put("/agents/:id", async (req, res) => {
  try {
    const kernel = await getKernel();
    const agentModule = kernel.getModule<AgentIntegrationModule>(
      "AgentIntegrationModule",
    );
    const client = agentModule.getClient();

    const result = await client.updateAgent(req.params.id, req.body);
    res.json(result);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/agents/:id", async (req, res) => {
  try {
    const kernel = await getKernel();
    const agentModule = kernel.getModule<AgentIntegrationModule>(
      "AgentIntegrationModule",
    );
    const client = agentModule.getClient();

    const result = await client.getAgent(req.params.id);
    res.json(result);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete("/agents/:id", async (req, res) => {
  try {
    const kernel = await getKernel();
    const agentModule = kernel.getModule<AgentIntegrationModule>(
      "AgentIntegrationModule",
    );
    const client = agentModule.getClient();

    await client.deleteAgent(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/agents/:agentId/executions", async (req, res) => {
  try {
    const kernel = await getKernel();
    const agentModule = kernel.getModule<AgentIntegrationModule>(
      "AgentIntegrationModule",
    );
    const client = agentModule.getClient();

    const result = await client.listExecutionsByAgent(req.params.agentId);
    res.json(result);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Kernel-admin endpoints for prompt metadata via PromptIntegrationModule
router.get("/prompts", async (_req, res) => {
  try {
    const kernel = await getKernel();

    const promptModule = kernel.getModule<PromptIntegrationModule>(
      "PromptIntegrationModule",
    );

    const client = promptModule.getClient();

    const list = await client.listPrompts();

    res.json(list);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/prompts/:id", async (req, res) => {
  try {
    const kernel = await getKernel();

    const promptModule = kernel.getModule<PromptIntegrationModule>(
      "PromptIntegrationModule",
    );

    const client = promptModule.getClient();

    const prompt = await client.getPrompt(req.params.id);

    if (!prompt)
      return res
        .status(404)
        .json({ success: false, message: "Prompt not found" });

    res.json(prompt);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/prompts/:id/versions", async (req, res) => {
  try {
    const kernel = await getKernel();

    const promptModule = kernel.getModule<PromptIntegrationModule>(
      "PromptIntegrationModule",
    );

    const client = promptModule.getClient();

    const versions = await client.getPromptVersions(req.params.id);

    res.json(versions);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/documents", async (_req, res) => {
  try {
    const kernel = await getKernel();

    const module = kernel.getModule<DocumentIntegrationModule>(
      "DocumentIntegrationModule",
    );

    const client = module.getClient();

    const documents = await client.listDocuments();

    res.json(documents);
  } catch (error: any) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Chat proxy routes
router.get("/chat/conversations", async (_req, res) => {
  try {
    const kernel = await getKernel();
    const chatModule = kernel.getModule<ChatIntegrationModule>(
      "ChatIntegrationModule",
    );
    const client = chatModule.getClient();

    const result = await client.listConversations();
    res.json(result);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/chat/conversations/:conversationId", async (req, res) => {
  try {
    const kernel = await getKernel();
    const chatModule = kernel.getModule<ChatIntegrationModule>(
      "ChatIntegrationModule",
    );
    const client = chatModule.getClient();

    const result = await client.getConversation(req.params.conversationId);
    res.json(result);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/chat/conversations", async (req, res) => {
  try {
    const kernel = await getKernel();
    const chatModule = kernel.getModule<ChatIntegrationModule>(
      "ChatIntegrationModule",
    );
    const client = chatModule.getClient();

    const result = await client.createConversation(req.body);
    res.json(result);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete("/chat/conversations/:conversationId", async (req, res) => {
  try {
    const kernel = await getKernel();
    const chatModule = kernel.getModule<ChatIntegrationModule>(
      "ChatIntegrationModule",
    );
    const client = chatModule.getClient();

    await client.deleteConversation(req.params.conversationId);
    res.json({ success: true });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/chat/messages", async (req, res) => {
  try {
    const kernel = await getKernel();
    const chatModule = kernel.getModule<ChatIntegrationModule>(
      "ChatIntegrationModule",
    );
    const client = chatModule.getClient();

    const result = await client.createMessage(req.body.conversationId, req.body);
    res.json(result);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/chat/messages/:conversationId", async (req, res) => {
  try {
    const kernel = await getKernel();
    const chatModule = kernel.getModule<ChatIntegrationModule>(
      "ChatIntegrationModule",
    );
    const client = chatModule.getClient();

    const result = await client.listMessages(req.params.conversationId);
    res.json(result);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Workspace proxy routes
router.get("/workspaces", async (_req, res) => {
  try {
    const kernel = await getKernel();
    const workspaceModule = kernel.getModule<WorkspaceIntegrationModule>(
      "WorkspaceIntegrationModule",
    );
    const client = workspaceModule.getClient();

    const result = await client.listWorkspaces();
    res.json(result);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/workspaces/:id", async (req, res) => {
  try {
    const kernel = await getKernel();
    const workspaceModule = kernel.getModule<WorkspaceIntegrationModule>(
      "WorkspaceIntegrationModule",
    );
    const client = workspaceModule.getClient();

    const result = await client.getWorkspace(req.params.id);
    res.json(result);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/workspaces", async (req, res) => {
  try {
    const kernel = await getKernel();
    const workspaceModule = kernel.getModule<WorkspaceIntegrationModule>(
      "WorkspaceIntegrationModule",
    );
    const client = workspaceModule.getClient();

    const result = await client.createWorkspace(req.body);
    res.json(result);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.patch("/workspaces/:id", async (req, res) => {
  try {
    const kernel = await getKernel();
    const workspaceModule = kernel.getModule<WorkspaceIntegrationModule>(
      "WorkspaceIntegrationModule",
    );
    const client = workspaceModule.getClient();

    const result = await client.updateWorkspace(req.params.id, req.body);
    res.json(result);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete("/workspaces/:id", async (req, res) => {
  try {
    const kernel = await getKernel();
    const workspaceModule = kernel.getModule<WorkspaceIntegrationModule>(
      "WorkspaceIntegrationModule",
    );
    const client = workspaceModule.getClient();

    await client.deleteWorkspace(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Test tool calling endpoint
router.post("/test-tools", async (req, res) => {
  try {
    console.log("[KernelRoutes] Testing tool calling");
    const kernel = await getKernel();
    
    const executionModule = kernel.getModule("ExecutionModule") as any;
    const toolRegistry = new ToolRegistry();
    
    // Register built-in tools for demo
    toolRegistry.register(new CalculatorTool());
    toolRegistry.register(new DateTimeTool());

    const availableTools = toolRegistry.definitions();
    
    res.json({
      success: true,
      message: "Tool calling test endpoint",
      availableTools: availableTools.map(t => t.function.name),
      toolDefinitions: availableTools,
      hasToolCallingExecutor: !!executionModule?.getExecutorRegistry()?.getExecutor("tool_calling"),
    });
  } catch (error: any) {
    console.error("[KernelRoutes] Tool calling test error:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message,
      error: "Failed to test tool calling"
    });
  }
});

export default router;
