export interface IToolCall {
  id?: string;
  name?: string;
  arguments?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface IPlan {
  action: string;
  details?: {
    parallelSteps?: IPlan[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}
