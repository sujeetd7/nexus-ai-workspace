import { IKernelExecutionRequest } from "./kernel/execution-request.interface";
import { KernelBuilder } from "./kernel/kernel-builder";
import { IKernel } from "./kernel/kernel.interface";

async function bootstrap() {
  const kernel: IKernel = new KernelBuilder().build();
  await kernel.start();

  // Example usage (this would typically come from an HTTP controller)
  try {
    const request: IKernelExecutionRequest = {
      prompt: "Tell me a short story about a brave knight.",
      userId: "test-user-123",
      workspaceId: "test-workspace-456",
      agentId: "test-agent-789",
      conversationId: "test-conversation-000",
      metadata: { customField: "customValue" },
    };
    const result = await kernel.execute(request);
    console.log("Kernel execution result:", result);
  } catch (error) {
    console.error("Kernel execution failed:", error);
  }

  // In a real application, you might keep the kernel running for HTTP requests
  // and only stop it on application shutdown.
  // For this example, we'll stop it after a short delay.
  setTimeout(async () => {
    await kernel.stop();
  }, 5000);
}

bootstrap().catch(console.error);
