import { metadataCache } from "../document-cache";

describe("MetadataCache (in-memory fallback)", () => {
  const key = "test:key";
  const value = { id: "1", title: "t" };

  it("sets and gets value", async () => {
    await metadataCache.set(key, value, 1);
    const v = await metadataCache.get(key);
    expect(v).toEqual(value);
  });

  it("expires after TTL", async () => {
    await metadataCache.set(key, value, 0); // immediate expiry
    const v = await metadataCache.get(key);
    expect(v).toBeNull();
  });

  it("deletes value", async () => {
    await metadataCache.set(key, value, 10);
    await metadataCache.del(key);
    const v = await metadataCache.get(key);
    expect(v).toBeNull();
  });
});
