const axios = require("axios");

const base =
  process.env.DOCUMENT_SERVICE_URL || process.env.DOCUMENT_SERVICE_PORT
    ? `http://localhost:${process.env.DOCUMENT_SERVICE_PORT}`
    : "http://localhost:3006";

async function safe(fn) {
  try {
    return await fn();
  } catch (err) {
    console.error(
      "ERROR",
      err && err.response
        ? `status=${err.response.status}`
        : err.message || err,
    );
    return null;
  }
}

async function run() {
  console.log("Document Service base:", base);

  // Health
  const health = await safe(() => axios.get(base + "/health"));
  console.log("health:", health ? health.status : "failed");

  // List
  const list = await safe(() => axios.get(base + "/api/v1/documents"));
  console.log(
    "list:",
    list
      ? Array.isArray(list.data)
        ? `${list.data.length} documents`
        : JSON.stringify(list.data).slice(0, 200)
      : "failed",
  );

  // Search
  const search = await safe(() =>
    axios.post(base + "/api/v1/documents/search", { query: "test", topK: 5 }),
  );
  console.log("search:", search ? `total=${search.data.total}` : "failed");

  // Reindex
  const reindex = await safe(() =>
    axios.post(base + "/api/v1/documents/reindex"),
  );
  console.log("reindex:", reindex ? reindex.status : "failed");

  // Workspace documents if provided
  const workspaceId = process.env.TEST_WORKSPACE_ID;
  if (workspaceId) {
    const w = await safe(() =>
      axios.get(base + `/api/v1/workspaces/${workspaceId}/documents`),
    );
    console.log(
      "workspaceDocuments:",
      w
        ? Array.isArray(w.data)
          ? `${w.data.length} docs`
          : JSON.stringify(w.data).slice(0, 200)
        : "failed",
    );
  } else {
    console.log("Skipping workspaceDocuments (TEST_WORKSPACE_ID not set)");
  }

  // If TEST_DOCUMENT_ID provided, try index/get/delete
  const docId = process.env.TEST_DOCUMENT_ID;
  if (docId) {
    const idx = await safe(() =>
      axios.post(base + `/api/v1/documents/${docId}/index`),
    );
    console.log("index:", idx ? idx.status : "failed");

    const get = await safe(() =>
      axios.get(base + `/api/v1/documents/${docId}`),
    );
    console.log(
      "getDocument:",
      get
        ? get.data && get.data.id
          ? `id=${get.data.id}`
          : JSON.stringify(get.data).slice(0, 120)
        : "failed",
    );

    const del = await safe(() =>
      axios.delete(base + `/api/v1/documents/${docId}`),
    );
    console.log("delete:", del ? del.status : "failed");
  } else {
    console.log("Skipping index/get/delete (TEST_DOCUMENT_ID not set)");
  }

  console.log("Direct API tests finished");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
