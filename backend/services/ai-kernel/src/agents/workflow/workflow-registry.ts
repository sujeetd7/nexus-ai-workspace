import { WorkflowDefinition } from "./workflow.types";
import { IWorkflowRegistry } from "./workflow.interface";
import {
  DuplicateWorkflowException,
  WorkflowNotFoundException,
} from "./workflow.exceptions";

export class WorkflowRegistry implements IWorkflowRegistry {
  private readonly workflows: Map<string, WorkflowDefinition> = new Map();
  private readonly workflowsByName: Map<string, WorkflowDefinition[]> =
    new Map();

  public async register(workflow: WorkflowDefinition): Promise<void> {
    if (!workflow.workflowId) {
      throw new Error("Workflow ID is required");
    }

    if (this.workflows.has(workflow.workflowId)) {
      throw new DuplicateWorkflowException(workflow.workflowId);
    }

    try {
      // Validate basic workflow structure
      this.validateWorkflowStructure(workflow);

      // Store workflow
      this.workflows.set(workflow.workflowId, workflow);

      // Index by name for lookups
      const nameKey = workflow.name.toLowerCase();
      const existingByName = this.workflowsByName.get(nameKey) || [];
      existingByName.push(workflow);
      this.workflowsByName.set(nameKey, existingByName);
    } catch (error) {
      if (error instanceof DuplicateWorkflowException) {
        throw error;
      }

      throw new Error(
        `Failed to register workflow '${workflow.workflowId}': ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  public async remove(workflowId: string): Promise<boolean> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      return false;
    }

    // Remove from main registry
    this.workflows.delete(workflowId);

    // Remove from name index
    const nameKey = workflow.name.toLowerCase();
    const existingByName = this.workflowsByName.get(nameKey) || [];
    const filteredByName = existingByName.filter(
      (w) => w.workflowId !== workflowId,
    );

    if (filteredByName.length === 0) {
      this.workflowsByName.delete(nameKey);
    } else {
      this.workflowsByName.set(nameKey, filteredByName);
    }

    return true;
  }

  public async find(
    workflowId: string,
  ): Promise<WorkflowDefinition | undefined> {
    return this.workflows.get(workflowId);
  }

  public async list(): Promise<WorkflowDefinition[]> {
    return Array.from(this.workflows.values());
  }

  public async exists(workflowId: string): Promise<boolean> {
    return this.workflows.has(workflowId);
  }

  public async findByName(name: string): Promise<WorkflowDefinition[]> {
    const nameKey = name.toLowerCase();
    return this.workflowsByName.get(nameKey) || [];
  }

  public async count(): Promise<number> {
    return this.workflows.size;
  }

  public async listByVersion(name: string): Promise<WorkflowDefinition[]> {
    const workflows = await this.findByName(name);
    return workflows.sort((a, b) => b.version.localeCompare(a.version));
  }

  public async getLatestVersion(
    name: string,
  ): Promise<WorkflowDefinition | undefined> {
    const workflows = await this.listByVersion(name);
    return workflows.length > 0 ? workflows[0] : undefined;
  }

  public async clear(): Promise<void> {
    this.workflows.clear();
    this.workflowsByName.clear();
  }

  private validateWorkflowStructure(workflow: WorkflowDefinition): void {
    // Validate required fields
    if (!workflow.workflowId) {
      throw new Error("Workflow ID is required");
    }

    if (!workflow.name) {
      throw new Error("Workflow name is required");
    }

    if (!workflow.version) {
      throw new Error("Workflow version is required");
    }

    if (!workflow.steps || workflow.steps.length === 0) {
      throw new Error("Workflow must have at least one step");
    }

    // Validate steps
    const stepIds = new Set<string>();
    for (const step of workflow.steps) {
      if (!step.stepId) {
        throw new Error("Step ID is required for all steps");
      }

      if (stepIds.has(step.stepId)) {
        throw new Error(`Duplicate step ID: ${step.stepId}`);
      }

      stepIds.add(step.stepId);

      if (!step.name) {
        throw new Error(`Step name is required for step ${step.stepId}`);
      }

      // Validate step dependencies
      for (const depId of step.dependsOn) {
        if (
          !stepIds.has(depId) &&
          !this.isStepIdInNestedSteps(depId, workflow.steps)
        ) {
          throw new Error(
            `Step ${step.stepId} depends on non-existent step: ${depId}`,
          );
        }
      }

      // Validate nested steps for composite step types
      if (step.steps && step.steps.length > 0) {
        this.validateNestedSteps(step.steps, stepIds);
      }
    }

    // Validate policies
    if (workflow.retryPolicy) {
      this.validateRetryPolicy(workflow.retryPolicy);
    }

    if (workflow.timeoutPolicy) {
      this.validateTimeoutPolicy(workflow.timeoutPolicy);
    }

    if (workflow.failurePolicy) {
      this.validateFailurePolicy(workflow.failurePolicy);
    }
  }

  private isStepIdInNestedSteps(stepId: string, steps: any[]): boolean {
    for (const step of steps) {
      if (step.stepId === stepId) {
        return true;
      }
      if (step.steps && step.steps.length > 0) {
        if (this.isStepIdInNestedSteps(stepId, step.steps)) {
          return true;
        }
      }
    }
    return false;
  }

  private validateNestedSteps(steps: any[], parentStepIds: Set<string>): void {
    const nestedStepIds = new Set<string>();

    for (const step of steps) {
      if (!step.stepId) {
        throw new Error("Nested step ID is required");
      }

      if (nestedStepIds.has(step.stepId) || parentStepIds.has(step.stepId)) {
        throw new Error(`Duplicate step ID in nested steps: ${step.stepId}`);
      }

      nestedStepIds.add(step.stepId);

      // Recursively validate further nested steps
      if (step.steps && step.steps.length > 0) {
        this.validateNestedSteps(
          step.steps,
          new Set([...parentStepIds, ...nestedStepIds]),
        );
      }
    }
  }

  private validateRetryPolicy(policy: any): void {
    if (policy.maxAttempts < 1) {
      throw new Error("Retry policy maxAttempts must be at least 1");
    }

    if (policy.backoffMs < 0) {
      throw new Error("Retry policy backoffMs must be non-negative");
    }

    if (policy.backoffMultiplier <= 0) {
      throw new Error("Retry policy backoffMultiplier must be positive");
    }

    if (policy.maxBackoffMs < policy.backoffMs) {
      throw new Error("Retry policy maxBackoffMs must be >= backoffMs");
    }
  }

  private validateTimeoutPolicy(policy: any): void {
    if (policy.stepTimeoutMs <= 0) {
      throw new Error("Timeout policy stepTimeoutMs must be positive");
    }

    if (policy.workflowTimeoutMs <= 0) {
      throw new Error("Timeout policy workflowTimeoutMs must be positive");
    }

    if (policy.stepTimeoutMs > policy.workflowTimeoutMs) {
      throw new Error("Step timeout cannot exceed workflow timeout");
    }
  }

  private validateFailurePolicy(policy: any): void {
    if (policy.maxFailures < 0) {
      throw new Error("Failure policy maxFailures must be non-negative");
    }

    if (policy.maxFailures === 0 && !policy.continueOnError) {
      throw new Error(
        "Failure policy must allow either maxFailures > 0 or continueOnError = true",
      );
    }
  }
}
