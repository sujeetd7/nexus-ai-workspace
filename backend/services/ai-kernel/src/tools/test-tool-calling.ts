#!/usr/bin/env ts-node

/**
 * Test script to verify tool calling functionality
 * Run with: npx ts-node src/tools/test-tool-calling.ts
 */

import { getKernel } from "../kernel/kernel.factory";
import { ToolRegistry } from "./registry/tool-registry";
import { CalculatorTool } from "./builtins/calculator.tool";
import { DateTimeTool } from "./builtins/datetime.tool";

async function testToolCalling() {
  console.log("=== Tool Calling Test ===\n");

  try {
    // Initialize kernel
    const kernel = await getKernel();
    
    // Test tool registry
    const toolRegistry = new ToolRegistry();
    toolRegistry.register(new CalculatorTool());
    toolRegistry.register(new DateTimeTool());

    console.log("Available tools:", toolRegistry.metadata().map(t => t.name));
    console.log("Tool definitions:", JSON.stringify(toolRegistry.definitions(), null, 2));

    // Test execution context setup
    const executionModule = kernel.getModule("ExecutionModule") as any;
    if (executionModule) {
      const executorRegistry = executionModule.getExecutorRegistry();
      console.log("Tool-calling executor available:", !!executorRegistry.getExecutor("tool_calling"));
    }

    console.log("\n✅ Tool calling infrastructure initialized successfully!");
    console.log("\nTo test full flow, send a request like:");
    console.log("'What is 15 + 27? Also tell me the current time.'");
    console.log("This should use both calculator and datetime tools.");

  } catch (error) {
    console.error("❌ Error testing tool calling:", error);
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testToolCalling();
}

export { testToolCalling };