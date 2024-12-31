import { createMocks } from "node-mocks-http";
import { describe, expect, it, vi } from "vitest";

import { MockAPL } from "../../../test-utils/mock-apl";
import { HolipolySyncWebhook } from "./holipoly-sync-webhook";
import { processHolipolyWebhook } from "./process-holipoly-webhook";

describe("HolipolySyncWebhook", () => {
  const mockApl = new MockAPL();

  it("Provides type-safe response builder in the context", async () => {
    vi.mock("./process-holipoly-webhook");

    vi.mocked(processHolipolyWebhook).mockImplementationOnce(async () => ({
      baseUrl: "example.com",
      event: "CHECKOUT_CALCULATE_TAXES",
      payload: { data: "test_payload" },
      schemaVersion: 3.19,
      authData: {
        domain: mockApl.workingHolipolyDomain,
        token: mockApl.mockToken,
        jwks: mockApl.mockJwks,
        holipolyApiUrl: mockApl.workingHolipolyApiUrl,
        appId: mockApl.mockAppId,
      },
    }));

    const { req, res } = createMocks({
      method: "POST",
      headers: {
        host: "some-holipoly-host.cloud",
        "x-forwarded-proto": "https",
        "holipoly-api-url": "https://mock-holipoly-domain.holipoly.cloud/graphql/",
        "holipoly-domain": "https://mock-holipoly-domain.holipoly.cloud/",
      },
    });

    const webhook = new HolipolySyncWebhook({
      apl: mockApl,
      webhookPath: "/test",
      event: "CHECKOUT_CALCULATE_TAXES",
      query: "",
      name: "Webhook test name",
      isActive: true,
    });

    const handler = webhook.createHandler((_req, _res, ctx) => {
      _res.send(
        ctx.buildResponse({
          lines: [
            {
              tax_rate: 8,
              total_net_amount: 10,
              total_gross_amount: 1.08,
            },
          ],
          shipping_price_gross_amount: 2,
          shipping_tax_rate: 8,
          shipping_price_net_amount: 1,
        })
      );
    });

    await handler(req, res);

    expect(res._getData()).toEqual(
      expect.objectContaining({
        lines: [
          {
            tax_rate: 8,
            total_net_amount: 10,
            total_gross_amount: 1.08,
          },
        ],
        shipping_price_gross_amount: 2,
        shipping_tax_rate: 8,
        shipping_price_net_amount: 1,
      })
    );
  });
});
