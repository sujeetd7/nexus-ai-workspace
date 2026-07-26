import { PromptCompiler } from "../compiler/prompt-compiler";

const compiler = new PromptCompiler();

const prompt = compiler.compile(
  "You are a senior architect working at {{company}}.",
  // "Review {{language}} code written by {{developer}}.",
  {
    company: "OpenAI",
    language: "TypeScript",
    developer: "Sujeet",
  },
);

console.log(prompt);
