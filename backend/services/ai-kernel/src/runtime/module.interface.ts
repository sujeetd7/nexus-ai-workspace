export interface RuntimeModule {
  readonly name: string;

  initialize(): Promise<void>;

  shutdown(): Promise<void>;
}
