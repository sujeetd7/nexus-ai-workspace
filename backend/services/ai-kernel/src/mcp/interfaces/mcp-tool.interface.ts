export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
    additionalProperties?: boolean;
  };
  outputSchema: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
    additionalProperties?: boolean;
  };
  metadata?: {
    version?: string;
    category?: string;
    tags?: string[];
    deprecated?: boolean;
    examples?: Array<{
      name: string;
      description: string;
      input: any;
      output: any;
    }>;
  };
}
