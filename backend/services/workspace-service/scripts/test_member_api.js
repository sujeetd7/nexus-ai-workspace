const http = require("http");
const post = (path, body) =>
  new Promise((res, rej) => {
    const d = JSON.stringify(body);
    const req = http.request(
      {
        hostname: "localhost",
        port: 3002,
        path,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(d),
        },
      },
      (r) => {
        let s = "";
        r.on("data", (c) => (s += c));
        r.on("end", () => res({ status: r.statusCode, body: s }));
      },
    );
    req.on("error", rej);
    req.write(d);
    req.end();
  });
const get = (path) =>
  new Promise((res, rej) => {
    http
      .get({ hostname: "localhost", port: 3002, path }, (r) => {
        let s = "";
        r.on("data", (c) => (s += c));
        r.on("end", () => res({ status: r.statusCode, body: s }));
      })
      .on("error", rej);
  });
const patch = (path, body) =>
  new Promise((res, rej) => {
    const d = JSON.stringify(body);
    const req = http.request(
      {
        hostname: "localhost",
        port: 3002,
        path,
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(d),
        },
      },
      (r) => {
        let s = "";
        r.on("data", (c) => (s += c));
        r.on("end", () => res({ status: r.statusCode, body: s }));
      },
    );
    req.on("error", rej);
    req.write(d);
    req.end();
  });
const del = (path) =>
  new Promise((res, rej) => {
    const req = http.request(
      { hostname: "localhost", port: 3002, path, method: "DELETE" },
      (r) => {
        let s = "";
        r.on("data", (c) => (s += c));
        r.on("end", () => res({ status: r.statusCode, body: s }));
      },
    );
    req.on("error", rej);
    req.end();
  });

(async () => {
  try {
    console.log("Creating workspace...");
    const create = await post("/api/v1/workspaces", {
      name: "testws",
      ownerId: "user-1",
    });
    console.log("CREATE", create.status, create.body);
    const ws = JSON.parse(create.body);
    const wid = ws.id;

    console.log("Adding member...");
    const add = await post(`/api/v1/workspaces/${wid}/members`, {
      userId: "user-2",
      role: "DEVELOPER",
    });
    console.log("ADD", add.status, add.body);
    const member = JSON.parse(add.body);
    const mid = member.id;

    console.log("Listing members...");
    const list = await get(`/api/v1/workspaces/${wid}/members`);
    console.log("LIST", list.status, list.body);

    console.log("Getting member...");
    const getm = await get(`/api/v1/workspaces/${wid}/members/${mid}`);
    console.log("GET", getm.status, getm.body);

    console.log("Patching member role...");
    const patched = await patch(`/api/v1/workspaces/${wid}/members/${mid}`, {
      role: "ADMIN",
    });
    console.log("PATCH", patched.status, patched.body);

    console.log("Deleting member...");
    const deleted = await del(`/api/v1/workspaces/${wid}/members/${mid}`);
    console.log("DELETE", deleted.status, deleted.body);
  } catch (err) {
    console.error("ERR", err);
  }
})();
