export interface ITool {
  readonly id: string;

  readonly name: string;

  readonly description: string;

  readonly version: string;

  readonly category: string;

  readonly enabled: boolean;

  readonly permissions: string[];

  readonly tags: string[];

  execute(input: any): Promise<any>;
}
