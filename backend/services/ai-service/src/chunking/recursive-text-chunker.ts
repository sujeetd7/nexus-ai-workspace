import { Chunker } from "./chunker.interface";

export class RecursiveTextChunker implements Chunker {
  constructor(
    private readonly chunkSize = 800,
    private readonly overlap = 150,
  ) {}

  chunk(text: string): string[] {
    if (!text.trim()) {
      return [];
    }

    const chunks: string[] = [];

    let start = 0;

    while (start < text.length) {
      const end = Math.min(start + this.chunkSize, text.length);

      chunks.push(text.substring(start, end));

      start += this.chunkSize - this.overlap;
    }

    return chunks;
  }
}
