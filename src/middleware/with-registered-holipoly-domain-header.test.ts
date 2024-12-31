import { Handler, Request } from "retes";
import { Response } from "retes/response";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { HOLIPOLY_API_URL_HEADER, HOLIPOLY_DOMAIN_HEADER } from "../const";
import { HolipolyApp } from "../holipoly-app";
import { MockAPL } from "../test-utils/mock-apl";
import { withHolipolyApp } from "./with-holipoly-app";
import { withRegisteredHolipolyDomainHeader } from "./with-registered-holipoly-domain-header";

const getMockSuccessResponse = async () => Response.OK({});

describe("middleware", () => {
  describe("withRegisteredHolipolyDomainHeader", () => {
    let mockHandlerFn: Handler = vi.fn(getMockSuccessResponse);

    const mockAPL = new MockAPL();

    beforeEach(() => {
      mockHandlerFn = vi.fn(getMockSuccessResponse);
    });

    it("Pass request when auth data are available", async () => {
      const mockRequest = {
        context: {},
        headers: {
          host: "my-holipoly-env.holipoly.cloud",
          "x-forwarded-proto": "https",
          [HOLIPOLY_DOMAIN_HEADER]: mockAPL.workingHolipolyDomain,
          [HOLIPOLY_API_URL_HEADER]: mockAPL.workingHolipolyApiUrl,
        },
      } as unknown as Request;

      const app = new HolipolyApp({
        apl: mockAPL,
      });

      const response = await withHolipolyApp(app)(
        withRegisteredHolipolyDomainHeader(mockHandlerFn)
      )(mockRequest);

      expect(response.status).toBe(200);
      expect(mockHandlerFn).toHaveBeenCalledOnce();
    });

    it("Reject request when auth data are not available", async () => {
      const mockRequest = {
        context: {},
        headers: {
          host: "my-holipoly-env.holipoly.cloud",
          "x-forwarded-proto": "https",
          [HOLIPOLY_DOMAIN_HEADER]: "not-registered.example.com",
          [HOLIPOLY_API_URL_HEADER]: "https://not-registered.example.com/graphql/",
        },
      } as unknown as Request;

      const app = new HolipolyApp({
        apl: mockAPL,
      });

      const response = await withHolipolyApp(app)(
        withRegisteredHolipolyDomainHeader(mockHandlerFn)
      )(mockRequest);
      expect(response.status).eq(403);
      expect(mockHandlerFn).toBeCalledTimes(0);
    });

    it("Throws if HolipolyApp not found in context", async () => {
      const mockRequest = {
        context: {},
        headers: {
          host: "my-holipoly-env.holipoly.cloud",
          "x-forwarded-proto": "https",
          [HOLIPOLY_DOMAIN_HEADER]: mockAPL.workingHolipolyDomain,
          [HOLIPOLY_API_URL_HEADER]: mockAPL.workingHolipolyApiUrl,
        },
      } as unknown as Request;

      const response = await withRegisteredHolipolyDomainHeader(mockHandlerFn)(mockRequest);

      expect(response.status).eq(500);
    });
  });
});
