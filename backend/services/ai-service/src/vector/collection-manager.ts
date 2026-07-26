export class CollectionManager {
  static documents(workspaceId: string) {
    return `workspace:${workspaceId}:documents`;
  }

  static prompts(workspaceId: string) {
    return `workspace:${workspaceId}:prompts`;
  }

  static memory(workspaceId: string) {
    return `workspace:${workspaceId}:memory`;
  }

  static conversations(workspaceId: string) {
    return `workspace:${workspaceId}:conversations`;
  }
}
