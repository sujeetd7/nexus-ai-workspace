export class ToolRetry {
  async execute(
    fn: () => Promise<any>,

    retries = 3,
  ) {
    let error;

    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (e) {
        error = e;
      }
    }

    throw error;
  }
}
