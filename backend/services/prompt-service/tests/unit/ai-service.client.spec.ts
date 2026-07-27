import axios from "axios";
import { AIServiceClient, AIServiceClientError } from "../../src/clients/ai-service.client";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

beforeEach(() => {
  jest.clearAllMocks();
  delete process.env.AI_SERVICE_URL;
});

describe("AIServiceClient.execute", () => {
  it("throws AIServiceClientError when AI_SERVICE_URL is not configured", async () => {
    const client = new AIServiceClient();

    await expect(
      client.execute({ provider: "openai", prompt: "Hello" }),
    ).rejects.toThrow(AIServiceClientError);

    await expect(
      client.execute({ provider: "openai", prompt: "Hello" }),
    ).rejects.toThrow("AI_SERVICE_URL is not configured");
  });

  it("returns data when AI service responds successfully", async () => {
    process.env.AI_SERVICE_URL = "http://localhost:3007";
    const responseData = {
      text: "Hi",
      promptTokens: 5,
      completionTokens: 3,
      totalTokens: 8,
      durationMs: 100,
      provider: "openai",
      model: "gpt-4",
    };
    mockedAxios.post = jest.fn().mockResolvedValue({ data: responseData });

    const client = new AIServiceClient();
    const result = await client.execute({ provider: "openai", prompt: "Hello" });

    expect(result).toEqual(responseData);
  });

  it("throws AIServiceClientError on network error — no mock fallback", async () => {
    process.env.AI_SERVICE_URL = "http://localhost:3007";
    const networkError = Object.assign(new Error("ECONNREFUSED"), { request: {} });
    mockedAxios.post = jest.fn().mockRejectedValue(networkError);

    const client = new AIServiceClient();

    await expect(
      client.execute({ provider: "openai", prompt: "Hello" }),
    ).rejects.toThrow(AIServiceClientError);

    const result = client.execute({ provider: "openai", prompt: "Hello" }).catch((e) => e);
    await expect(result).resolves.toBeInstanceOf(AIServiceClientError);

    // Must not return fabricated text
    const caught = await client.execute({ provider: "openai", prompt: "Hello" }).catch((e) => e);
    expect(caught).not.toHaveProperty("text");
  });

  it("throws AIServiceClientError on HTTP error response — no mock fallback", async () => {
    process.env.AI_SERVICE_URL = "http://localhost:3007";
    const httpError = Object.assign(new Error("Bad Gateway"), {
      response: { status: 502, statusText: "Bad Gateway", data: {} },
    });
    mockedAxios.post = jest.fn().mockRejectedValue(httpError);

    const client = new AIServiceClient();

    await expect(
      client.execute({ provider: "openai", prompt: "Hello" }),
    ).rejects.toThrow(AIServiceClientError);
  });
});
