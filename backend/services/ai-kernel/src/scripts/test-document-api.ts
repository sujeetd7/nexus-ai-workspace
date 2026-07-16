import { getKernel } from "../kernel/kernel.factory";

async function run() {
  console.log("Starting document API tests via Kernel...");

  const kernel = await getKernel();

  let module: any;
  try {
    module = kernel.getModule("DocumentIntegrationModule");
  } catch (err) {
    console.error("DocumentIntegrationModule not registered in kernel.", err);
    process.exit(1);
  }

  const client = module.getClient();

  // 1. health
  try {
    const healthy = await client.health();
    console.log("health:", healthy);
  } catch (err) {
    console.error("health check failed:", err?.message ?? err);
  }

  // 2. listDocuments
  try {
    const list = await client.listDocuments();
    console.log(
      "listDocuments: count=",
      Array.isArray(list) ? list.length : "?",
      Array.isArray(list) ? list.slice(0, 3) : list,
    );
  } catch (err) {
    console.error("listDocuments failed:", err?.message ?? err);
  }

  // 3. search
  try {
    const sr = await client.search({ query: "test", topK: 5 });
    console.log(
      "search: total=",
      sr?.total,
      "returned=",
      sr?.documents?.length,
    );
  } catch (err) {
    console.error("search failed:", err?.message ?? err);
  }

  // 4. reindex
  try {
    await client.reindex();
    console.log("reindex: ok");
  } catch (err) {
    console.error("reindex failed:", err?.message ?? err);
  }

  // 5. workspaceDocuments (if WORKSPACE_ID set)
  const workspaceId = process.env.TEST_WORKSPACE_ID;
  if (workspaceId) {
    try {
      const wdocs = await client.workspaceDocuments(workspaceId);
      console.log(
        "workspaceDocuments: count=",
        Array.isArray(wdocs) ? wdocs.length : "?",
        Array.isArray(wdocs) ? wdocs.slice(0, 3) : wdocs,
      );
    } catch (err) {
      console.error("workspaceDocuments failed:", err?.message ?? err);
    }
  } else {
    console.log("Skipping workspaceDocuments (TEST_WORKSPACE_ID not set)");
  }

  // 6. index a sample id (if provided)
  const sampleId = process.env.TEST_DOCUMENT_ID;
  if (sampleId) {
    try {
      await client.index(sampleId);
      console.log("index:", sampleId);
    } catch (err) {
      console.error("index failed:", err?.message ?? err);
    }

    try {
      const doc = await client.getDocument(sampleId);
      console.log("getDocument:", doc?.id ?? "(no id)");
    } catch (err) {
      console.error("getDocument failed:", err?.message ?? err);
    }

    try {
      await client.deleteDocument(sampleId);
      console.log("deleteDocument:", sampleId);
    } catch (err) {
      console.error("deleteDocument failed:", err?.message ?? err);
    }
  } else {
    console.log("Skipping index/get/delete (TEST_DOCUMENT_ID not set)");
  }

  console.log("Document API tests finished.");
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
