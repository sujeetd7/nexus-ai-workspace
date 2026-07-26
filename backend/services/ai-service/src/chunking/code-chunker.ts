import { Chunker } from "./chunker.interface";
import { RecursiveTextChunker } from "./recursive-text-chunker";

export class CodeChunker implements Chunker {
  private readonly inner = new RecursiveTextChunker(1200, 200);

  constructor() {}

  chunk(text: string): string[] {
    if (!text.trim()) return [];

    // Heuristic: split on two or more newlines (separating top-level blocks)
    const blocks = text
      .split(/\n{2,}/g)
      .map((b) => b.trim())
      .filter(Boolean);

    const chunks: string[] = [];
    for (const block of blocks) {
      // If block is small, keep as-is; otherwise delegate to inner chunker
      if (block.length <= 1200) {
        chunks.push(block);
      } else {
        chunks.push(...this.inner.chunk(block));
      }
    }

    return chunks;
  }
}
