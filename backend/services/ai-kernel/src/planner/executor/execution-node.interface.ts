export interface ExecutionNode {
  id: string;

  type: string;

  name: string;

  enabled: boolean;

  dependsOn: string[];

  execute(context: any): Promise<any>;
}
