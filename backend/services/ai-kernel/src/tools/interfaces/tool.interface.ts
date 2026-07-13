export interface ITool {
  readonly id: string;

  readonly name: string;

  readonly description: string;

  readonly version: string;

  readonly enabled: boolean;

  execute(input: any): Promise<any>;
  readonly category: "builtin" | "plugin" | "mcp" | "skill";
  readonly permissions: string[];
  readonly tags: string[];
  readonly inputSchema?: object;
  readonly outputSchema?: object;
  readonly timeout?: number;
}
