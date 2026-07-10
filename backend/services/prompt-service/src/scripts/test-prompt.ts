import { PromptService } from "../prompts";

const service = new PromptService();

const prompt = service.build("rag", {
  context: "React Native is developed by Meta.",
  question: "Who developed React Native?",
});

console.log(prompt);
