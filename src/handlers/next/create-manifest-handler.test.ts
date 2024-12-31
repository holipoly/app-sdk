import { createMocks } from "node-mocks-http";
import { describe, expect, it } from "vitest";

import { AppManifest } from "../../types";
import { createManifestHandler } from "./create-manifest-handler";

describe("createManifestHandler", () => {
  it("Creates a handler that responds with Manifest. Includes request in context", async () => {
    expect.assertions(3);

    const { res, req } = createMocks({
      headers: {
        host: "some-holipoly-host.cloud",
        "x-forwarded-proto": "https",
      },
      method: "GET",
    });

    const handler = createManifestHandler({
      manifestFactory({ appBaseUrl, request }): AppManifest {
        expect(request).toBeDefined();
        expect(request.headers.host).toBe("some-holipoly-host.cloud");

        return {
          name: "Mock name",
          tokenTargetUrl: `${appBaseUrl}/api/register`,
          appUrl: appBaseUrl,
          permissions: [],
          id: "app-id",
          version: "1",
        };
      },
    });

    await handler(req, res);

    expect(res._getJSONData()).toEqual({
      appUrl: "https://some-holipoly-host.cloud",
      id: "app-id",
      name: "Mock name",
      permissions: [],
      tokenTargetUrl: "https://some-holipoly-host.cloud/api/register",
      version: "1",
    });
  });
});
