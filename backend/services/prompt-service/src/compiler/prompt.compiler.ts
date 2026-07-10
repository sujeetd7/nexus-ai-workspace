export class PromptCompiler {
  private readonly regex = /\{\{(.*?)\}\}/g;

  extract(text: string): string[] {
    const variables = new Set<string>();

    let match;

    while ((match = this.regex.exec(text)) !== null) {
      variables.add(match[1].trim());
    }

    return [...variables];
  }

  compile(template: string, variables: Record<string, unknown>) {
    return template.replace(this.regex, (_, key) => {
      const value = variables[key.trim()];

      return value == null ? `{{${key}}}` : String(value);
    });
  }

  validate(template: string, variables: Record<string, unknown>) {
    const required = this.extract(template);

    const missing = required.filter((v) => !(v in variables));

    return {
      valid: missing.length === 0,

      missing,

      required,
    };
  }
}
