export class TemplateEngine {
  render(template: string, variables: Record<string, unknown>): string {
    return template.replace(/\{\{(.*?)\}\}/g, (_, key: string) => {
      const value = variables[key.trim()];

      if (value === undefined || value === null) {
        return "";
      }

      return String(value);
    });
  }
}
