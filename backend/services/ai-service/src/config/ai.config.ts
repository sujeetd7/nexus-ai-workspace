export interface AIProviderConfig {
  provider: string;
  defaultModel: string;
  supportsStreaming: boolean;
  supportsEmbeddings: boolean;
}

export const AI_PROVIDERS: Record<string, AIProviderConfig> = {
  ollama: {
    provider: "ollama",
    defaultModel: process.env.OLLAMA_MODEL ?? "qwen2.5-coder:1.5b",
    supportsStreaming: true,
    supportsEmbeddings: true,
  },

  openai: {
    provider: "openai",
    defaultModel: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
    supportsStreaming: true,
    supportsEmbeddings: true,
  },

  gemini: {
    provider: "gemini",
    defaultModel: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
    supportsStreaming: true,
    supportsEmbeddings: true,
  },

  claude: {
    provider: "claude",
    defaultModel: process.env.CLAUDE_MODEL ?? "claude-sonnet-4-20250514",
    supportsStreaming: true,
    supportsEmbeddings: false,
  },
};
