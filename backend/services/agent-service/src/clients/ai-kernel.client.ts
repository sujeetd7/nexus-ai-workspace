import axios from "axios";

export class AIKernelClient {
  private readonly client = axios.create({
    baseURL: process.env.AI_KERNEL_URL ?? "http://127.0.0.1:3010/api/v1",
    timeout: 60000,
  });

  async execute(payload: {
    provider: string;
    model: string;
    systemPrompt?: string | null;
    prompt: string;
    temperature?: number;
  }) {
    try {
      const started = Date.now();

      console.log("[AI_KERNEL_CLIENT] Sending request to:", this.client.defaults.baseURL + "/kernel/execute");
      console.log("[AI_KERNEL_CLIENT] Payload:", JSON.stringify(payload, null, 2));

      const response = await this.client.post("/kernel/execute", payload);
      
      console.log("[AI_KERNEL_CLIENT] Raw response status:", response.status);
      console.log("[AI_KERNEL_CLIENT] Raw response headers:", response.headers);
      console.log("[AI_KERNEL_CLIENT] Raw response data:", JSON.stringify(response.data, null, 2));

      const latency = Date.now() - started;
      
      // Validate response structure
      if (typeof response.data === 'undefined') {
        throw new Error("AI Kernel returned undefined response");
      }

      const result = {
        output: response.data,
        latency: latency,
        tokens: response.data.totalTokens ?? response.data.tokens ?? 0,
      };

      console.log("[AI_KERNEL_CLIENT] Processed result:", JSON.stringify(result, null, 2));
      
      return result;
    } catch (error: any) {
      console.error("[AI_KERNEL_CLIENT] ERROR:", error);
      if (error.response) {
        console.error("[AI_KERNEL_CLIENT] Response error status:", error.response.status);
        console.error("[AI_KERNEL_CLIENT] Response error data:", error.response.data);
        console.error("[AI_KERNEL_CLIENT] Response error headers:", error.response.headers);
        
        // Create a more detailed error for the 500 response
        const detailedError = new Error(
          `AI Kernel returned ${error.response.status}: ${error.response.statusText}. ` +
          `Response: ${JSON.stringify(error.response.data)}`
        );
        detailedError.stack = error.stack;
        throw detailedError;
      } else if (error.request) {
        // The request was made but no response was received
        const connectionError = new Error(
          `AI Kernel connection failed. No response received from ${this.client.defaults.baseURL}/kernel/execute. ` +
          `Check if AI Kernel service is running and accessible.`
        );
        connectionError.stack = error.stack;
        throw connectionError;
      } else {
        console.error("[AI_KERNEL_CLIENT] Stack trace:", error instanceof Error ? error.stack : 'No stack trace');
        throw error;
      }
    }
  }
}
