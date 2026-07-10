import { PromptTemplate } from "../prompts/prompt.interface";

export const SummaryPrompt: PromptTemplate = {
  name: "summary",

  version: "1.0.0",

  description: "Conversation summarization",

  template: `
Summarize the following conversation.

Conversation

{{conversation}}

Summary:
`,
};
