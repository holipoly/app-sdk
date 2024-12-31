import { describe, expect, test } from "vitest";

import { getJwksUrlFromHolipolyApiUrl } from "./urls";

describe("urls.ts", () => {
  describe("getJwksUrlFromHolipolyApiUrl function", () => {
    test("Resolves valid url from holipoly api url", () => {
      expect(getJwksUrlFromHolipolyApiUrl("https://my-holipoly.holipoly.cloud")).toBe(
        "https://my-holipoly.holipoly.cloud/.well-known/jwks.json"
      );
    });
  });
});
