import { ProviderFactory } from "../../src/providers/provider.factory";
import { ProviderManager } from "../../src/providers/provider-manager";
import { ProviderError } from "../../src/errors/provider.error";
import { ProviderRegistry } from "../../src/providers/provider.registry";
import { AIProvider } from "../../src/providers/provider.interface";

describe("ProviderFactory — normalized unknown provider errors", () => {
  describe("static create (used by ProviderManager)", () => {
    it("returns the registered provider for an explicit mock request", () => {
      const provider = ProviderFactory.create("mock");
      expect(provider).toBeDefined();
    });

    it("throws ProviderError with provider_not_found for unknown provider", () => {
      expect(() => ProviderFactory.create("nonexistent-provider-xyz")).toThrow(
        ProviderError,
      );

      try {
        ProviderFactory.create("nonexistent-provider-xyz");
      } catch (err) {
        expect(err).toBeInstanceOf(ProviderError);
        const pe = err as ProviderError;
        expect(pe.code).toBe("provider_not_found");
        expect(pe.status).toBe(404);
        expect(pe.message).toMatch(/Unknown provider/);
      }
    });

    it("does not silently return MockProvider for unknown names", () => {
      expect(() => ProviderFactory.create("does-not-exist")).toThrow(
        ProviderError,
      );
    });
  });

  describe("instance create", () => {
    it("returns provider for a registered name", () => {
      const factory = ProviderFactory.getInstance();
      const provider = factory.create("mock");
      expect(provider).toBeDefined();
    });

    it("throws ProviderError for an unknown provider", () => {
      const factory = ProviderFactory.getInstance();
      expect(() => factory.create("unknown-xyz")).toThrow(ProviderError);
    });
  });

  describe("getAvailableProviders", () => {
    it("lists registered provider names", () => {
      const names = ProviderFactory.getInstance().getAvailableProviders();
      expect(Array.isArray(names)).toBe(true);
      expect(names).toContain("mock");
    });
  });
});

describe("ProviderManager — same domain error codes", () => {
  it("rethrows provider_not_found for unknown provider", async () => {
    const manager = new ProviderManager();

    await expect(manager.getProvider("totally-unknown")).rejects.toMatchObject({
      name: "ProviderError",
      code: "provider_not_found",
      status: 404,
    });
  });

  it("returns provider_unavailable for known but unhealthy provider", async () => {
    const unhealthy: AIProvider = {
      execute: jest.fn(),
      stream: jest.fn() as unknown as AIProvider["stream"],
      health: jest.fn().mockResolvedValue(false),
      embed: jest.fn(),
    };

    ProviderRegistry.register("unhealthy-test", unhealthy);

    const manager = new ProviderManager();

    await expect(manager.getProvider("unhealthy-test")).rejects.toMatchObject({
      name: "ProviderError",
      code: "provider_unavailable",
      status: 503,
    });
  });

  it("returns healthy mock provider only when explicitly requested", async () => {
    const manager = new ProviderManager();
    const provider = await manager.getProvider("mock");
    expect(provider).toBeDefined();
  });
});
