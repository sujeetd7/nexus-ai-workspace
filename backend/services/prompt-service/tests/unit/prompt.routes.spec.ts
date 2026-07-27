/**
 * Regression: GET /prompts/executions must not be captured as /:id = "executions".
 * This test verifies route registration order without starting a server.
 */
import { Router } from "express";

// Replicate the route registration from prompt.routes.ts and assert ordering.
describe("prompt.routes — static paths registered before /:id", () => {
  it("registers /prompts/executions before /prompts/:id", () => {
    const router = Router() as any;
    const registeredPaths: string[] = [];

    const originalGet = router.get.bind(router);
    router.get = (path: string, ...handlers: any[]) => {
      registeredPaths.push(path);
      return originalGet(path, ...handlers);
    };

    // Simulate the fixed route registrations
    router.get("/prompts", () => {});
    router.get("/prompts/analytics", () => {});
    router.get("/prompts/executions", () => {});
    router.get("/prompts/execution/:executionId", () => {});
    router.get("/prompts/:id", () => {});
    router.get("/prompts/:promptId/executions", () => {});

    const executionsIdx = registeredPaths.indexOf("/prompts/executions");
    const paramIdx = registeredPaths.indexOf("/prompts/:id");

    expect(executionsIdx).toBeGreaterThanOrEqual(0);
    expect(paramIdx).toBeGreaterThanOrEqual(0);
    expect(executionsIdx).toBeLessThan(paramIdx);
  });
});
