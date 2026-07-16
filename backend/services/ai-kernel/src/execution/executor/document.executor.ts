import { DocumentIntegrationModule } from "../../integrations/document/document-integration.module";
import { IKernel } from "../../kernel/kernel.interface";
import { ExecutionContext } from "../engine/execution-context";
import { ExecutionResult } from "../engine/execution-result";
import { IExecutionExecutor } from "./executor.interface";

export class DocumentExecutor implements IExecutionExecutor {
  constructor(private kernel?: IKernel) {}

  public async execute(context: ExecutionContext) {
    console.log("[DocumentExecutor]");

    // If DocumentIntegrationModule isn't registered, skip gracefully
    let docs: any[] = [];

    try {
      if (!this.kernel) {
        return ExecutionResult.builder(context.requestId)
          .setSuccess(true)
          .setOutput({ documents: [] })
          .setLatencyMs(0)
          .setFinishReason("skipped")
          .build();
      }

      const module = this.kernel.getModule<DocumentIntegrationModule>(
        "DocumentIntegrationModule",
      );

      const client = module.getClient();

      const payload = context.payload || {};

      // Load by explicit documentIds
      if (payload.documentIds && Array.isArray(payload.documentIds)) {
        for (const id of payload.documentIds) {
          try {
            const d = await client.getDocument(id);
            docs.push(d);
          } catch (err: any) {
            if (err?.response?.status === 404) {
              // skip
              continue;
            }
            throw err;
          }
        }
      }

      // Perform a search if query provided or knowledgeBase/workspaceId present
      if (payload.query || payload.knowledgeBase || payload.workspaceId) {
        const searchReq: any = {
          query: payload.query ?? "",
          topK: payload.topK ?? 5,
          knowledgeBase: payload.knowledgeBase,
          workspaceId: payload.workspaceId,
        };

        const sr = await client.search(searchReq);
        if (sr?.documents) {
          docs = docs.concat(sr.documents);
        }

        // attach searchResults
        context.payload.searchResults = sr;
      }

      // Cache minimal fields into payload.documents
      context.payload.documents = docs;
      context.payload.documentIds = docs.map((d: any) => d.id);

      return ExecutionResult.builder(context.requestId)
        .setSuccess(true)
        .setOutput({ documents: docs })
        .setLatencyMs(Date.now() - context.startTime)
        .setFinishReason("completed")
        .build();
    } catch (err) {
      console.error("[DocumentExecutor] error", err);
      return ExecutionResult.builder(context.requestId)
        .setSuccess(false)
        .setOutput({ documents: docs })
        .setLatencyMs(Date.now() - context.startTime)
        .setFinishReason("error")
        .build();
    }
  }
}
