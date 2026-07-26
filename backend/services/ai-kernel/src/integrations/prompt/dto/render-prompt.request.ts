export interface RenderPromptRequest {
  key?: string;
  promptId?: string;
  variables?: Record<string, any>;
  promptVersion?: string;
  workspaceId?: string;
}
