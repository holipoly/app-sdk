import { Request } from "retes";
import { Response } from "retes/response";
import { describe, expect, it } from "vitest";

import { FileAPL } from "../APL";
import { HOLIPOLY_DOMAIN_HEADER } from "../const";
import { HolipolyApp } from "../holipoly-app";
import { withHolipolyApp } from "./with-holipoly-app";

describe("middleware", () => {
  describe("withHolipolyApp", () => {
    it("Adds HolipolyApp instance to request context", async () => {
      const mockRequest = {
        context: {},
        headers: {
          [HOLIPOLY_DOMAIN_HEADER]: "example.com",
        },
      } as unknown as Request;

      await withHolipolyApp(new HolipolyApp({ apl: new FileAPL() }))((request) => {
        expect(request.context.holipolyApp).toBeDefined();

        return Response.OK("");
      })(mockRequest);
    });
  });
});
