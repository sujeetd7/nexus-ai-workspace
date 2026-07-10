export interface CompilePromptRequest {
  systemPrompt: string;
  userPrompt: string;
  variables?: Record<string, unknown>;
}

export interface CompiledPrompt {
  systemPrompt: string;
  userPrompt: string;
}

export class PromptCompiler {
  private readonly regex = /\{\{(.*?)\}\}/g;

  extract(template: string): string[] {
    const variables = new Set<string>();

    let match: RegExpExecArray | null;

    while ((match = this.regex.exec(template)) !== null) {
      variables.add(match[1].trim());
    }

    return [...variables];
  }

  validate(template: string, variables: Record<string, unknown>) {
    const required = this.extract(template);

    const missing = required.filter((variable) => !(variable in variables));

    return {
      valid: missing.length === 0,
      required,
      missing,
    };
  }

  compile(template: string, variables: Record<string, unknown>): string {
    return template.replace(this.regex, (_, key: string) => {
      const value = variables[key.trim()];

      return value === undefined || value === null
        ? `{{${key}}}`
        : String(value);
    });
  }
}
