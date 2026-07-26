export class VariableResolver {
  resolve(variables?: Record<string, unknown>): Record<string, unknown> {
    return {
      date: new Date().toISOString(),
      timestamp: Date.now(),
      ...variables,
    };
  }
}
