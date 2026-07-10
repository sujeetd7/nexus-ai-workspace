import { Chunker } from "./chunker.interface";
import { CodeChunker } from "./code-chunker";
import { MarkdownChunker } from "./markdown-chunker";
import { RecursiveTextChunker } from "./recursive-text-chunker";

export class ChunkerFactory {
  static create(type: "text" | "markdown" | "code" = "text"): Chunker {
    switch (type) {
      case "markdown":
        return new MarkdownChunker();
      case "code":
        return new CodeChunker();
      case "text":
      default:
        return new RecursiveTextChunker();
    }
  }
}
