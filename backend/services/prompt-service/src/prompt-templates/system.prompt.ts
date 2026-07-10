import { PromptTemplate } from "../prompts/prompt.interface";

export const SystemPrompt: PromptTemplate = {
  name: "system",

  version: "1.0.0",

  description: "Default system prompt",

  template: `
You are Nexus AI.

Be accurate.

Be concise.

Never fabricate information.

Always answer professionally.
`,
};
