export interface IExecutor {
  supports(type: string): boolean;

  execute(input: any): Promise<any>;
}
