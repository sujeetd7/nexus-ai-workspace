import { PromptRepository } from "./prompt.repository";

export class PromptService {
  private readonly repository = new PromptRepository();

  /**
   * Returns raw prompt template
   */
  get(name: string): string {
    return this.repository.get(name).template;
  }

  /**
   * Returns prompt after replacing variables
   */
  build(name: string, variables: Record<string, string>): string {
    let template = this.get(name);

    for (const [key, value] of Object.entries(variables)) {
      template = template.replaceAll(`{{${key}}}`, value);
    }

    return template;
  }

  getAll() {
    return this.repository.getAll();
  }
}
