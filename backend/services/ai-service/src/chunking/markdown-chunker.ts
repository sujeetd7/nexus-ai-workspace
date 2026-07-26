import { Chunker } from "./chunker.interface";
import { RecursiveTextChunker } from "./recursive-text-chunker";

export class MarkdownChunker implements Chunker {
  private readonly inner = new RecursiveTextChunker();

  constructor() {}

  chunk(text: string): string[] {
    if (!text.trim()) return [];

    // Split by headings while keeping the heading with the section
    const sections: string[] = [];
    const regex = /^#{1,6}\s.*$/gm;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    const indices: number[] = [];
    while ((match = regex.exec(text)) !== null) {
      indices.push(match.index);
    }

    if (indices.length === 0) {
      return this.inner.chunk(text);
    }

    for (let i = 0; i < indices.length; i++) {
      const start = indices[i];
      const end = indices[i + 1] ?? text.length;
      sections.push(text.substring(start, end).trim());
      lastIndex = end;
    }

    if (lastIndex < text.length && indices[0] !== 0) {
      // Prepend any leading content before the first heading
      const leading = text.substring(0, indices[0]).trim();
      if (leading) sections.unshift(leading);
    }

    // Chunk each section with the recursive chunker to respect sizes and overlap
    const chunks: string[] = [];
    for (const sec of sections) {
      const parts = this.inner.chunk(sec);
      chunks.push(...parts);
    }

    return chunks;
  }
}
