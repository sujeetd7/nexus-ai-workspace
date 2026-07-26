import { PromptCompiler } from "../compiler/prompt-compiler";

const compiler = new PromptCompiler();

export class PromptDiffUtil {
  static compare(a: any, b: any) {
    const oldVariables = compiler.extract(
      `${a.systemPrompt ?? ""}

${a.userPrompt ?? ""}`,
    );

    const newVariables = compiler.extract(
      `${b.systemPrompt ?? ""}

${b.userPrompt ?? ""}`,
    );

    return {
      versionA: a.version,

      versionB: b.version,

      changes: {
        systemPrompt: {
          changed: a.systemPrompt !== b.systemPrompt,

          old: a.systemPrompt,

          new: b.systemPrompt,
        },

        userPrompt: {
          changed: a.userPrompt !== b.userPrompt,

          old: a.userPrompt,

          new: b.userPrompt,
        },

        provider: {
          changed: a.provider !== b.provider,

          old: a.provider,

          new: b.provider,
        },

        model: {
          changed: a.model !== b.model,

          old: a.model,

          new: b.model,
        },

        temperature: {
          changed: a.temperature !== b.temperature,

          old: a.temperature,

          new: b.temperature,
        },

        variablesAdded: newVariables.filter((v) => !oldVariables.includes(v)),

        variablesRemoved: oldVariables.filter((v) => !newVariables.includes(v)),
      },
    };
  }
}
