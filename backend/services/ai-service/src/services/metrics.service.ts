export class MetricsService {
  logExecution(
    provider: string,

    duration: number,

    tokens: number,
  ) {
    console.log({
      provider,

      duration,

      tokens,

      timestamp: new Date(),
    });
  }
}
