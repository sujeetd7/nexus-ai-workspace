import axios from "axios";
import { DocumentServiceClient } from "../document-service.client";

jest.mock("axios");

describe("DocumentServiceClient", () => {
  const mockedAxios = axios as jest.Mocked<typeof axios>;

  beforeEach(() => {
    mockedAxios.create.mockReturnValue({
      get: jest.fn(),
      post: jest.fn(),
      delete: jest.fn(),
    } as any);
  });

  it("calls health endpoint", async () => {
    const instance: any = {
      get: jest.fn().mockResolvedValue({ status: 200 }),
    };
    mockedAxios.create.mockReturnValue(instance);

    const client = new DocumentServiceClient({ url: "http://localhost:3006" });
    const ok = await client.health();
    expect(ok).toBe(true);
  });
});
