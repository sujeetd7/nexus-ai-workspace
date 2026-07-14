import { Router } from "express";
import { PromptIntegrationModule } from "../integrations/prompt/prompt-integration.module";
import { getKernel } from "../kernel/kernel.factory";

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

export default router;
