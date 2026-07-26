export class ToolRateLimiter {
  private readonly requests = new Map<string, number>();

  canExecute(
    tool: string,

    limit: number,
  ) {
    const count = this.requests.get(tool) ?? 0;

    if (count >= limit) {
      return false;
    }

    this.requests.set(tool, count + 1);

    return true;
  }
}
