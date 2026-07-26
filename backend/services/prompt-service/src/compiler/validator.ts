export class PromptValidator {
  validate(template: string, variables: Record<string, unknown>): string[] {
    const missing: string[] = [];

    const matches = template.match(/\{\{(.*?)\}\}/g);

    if (!matches) {
      return [];
    }

    for (const variable of matches) {
      const key = variable.replace("{{", "").replace("}}", "").trim();

      if (!(key in variables)) {
        missing.push(key);
      }
    }

    return [...new Set(missing)];
  }
}
