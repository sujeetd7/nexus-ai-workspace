// Test file to verify new AI Service architecture
import { CompletionService } from "./llm/completion.service";
import { StreamingService } from "./llm/streaming.service";
import { ModelRegistry } from "./providers/model-registry";
import { UsageService } from "./usage/usage.service";
import { ProviderHealthService } from "./health/provider-health.service";
import { ProviderRouter } from "./providers/provider-router";

async function testServices() {
  console.log("Testing new AI Service architecture...");

  // Test Model Registry
  const modelRegistry = new ModelRegistry();
  console.log(
    "Default chat provider:",
    modelRegistry.getDefaultProvider("chat"),
  );
  console.log(
    "Default embedding provider:",
    modelRegistry.getDefaultProvider("embedding"),
  );

  // Test Provider Router
  const providerRouter = new ProviderRouter();
  console.log("Available providers:", providerRouter.getAvailableProviders());

  // Test Health Service
  const healthService = new ProviderHealthService();
  const systemHealth = await healthService.health();
  console.log("System health:", systemHealth);

  // Test Completion Service
  const completionService = new CompletionService();
  // Note: This would require actual provider setup to work
  console.log("CompletionService initialized");

  // Test Usage Service
  const usageService = new UsageService();
  const usage = await usageService.trackUsage({
    provider: "ollama",
    model: "qwen2.5-coder:1.5b",
    promptTokens: 10,
    completionTokens: 20,
    totalTokens: 30,
    latency: 1500,
  });
  console.log("Usage tracked:", usage);

  console.log("All services initialized successfully!");
}

if (require.main === module) {
  testServices().catch(console.error);
}

export { testServices };
