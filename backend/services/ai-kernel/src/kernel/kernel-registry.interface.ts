export type ProviderRegistry = Map<string, any>;
export type ToolRegistry = Map<string, any>;
export type MemoryRegistry = Map<string, any>;
export type PlannerRegistry = Map<string, any>;
export type PromptRegistry = Map<string, any>;
export type PipelineRegistry = Map<string, any>;

export interface IKernelRegistry {
  providers: ProviderRegistry;
  tools: ToolRegistry;
  memories: MemoryRegistry;
  planners: PlannerRegistry;
  prompts: PromptRegistry;
  pipelines: PipelineRegistry;
}
