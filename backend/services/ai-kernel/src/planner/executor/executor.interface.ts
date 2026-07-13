export interface IExecutor {
  supports(type: string): boolean;

  execute(context: any): Promise<any>;
}
