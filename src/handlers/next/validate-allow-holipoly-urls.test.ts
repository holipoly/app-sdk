import { describe, expect, it } from "vitest";

import { validateAllowHolipolyUrls } from "./validate-allow-holipoly-urls";

const holipolyCloudUrlMock = "https://my-shop.holipoly.cloud/graphql/";
const onPremiseHolipolyUrlMock = "https://my-shop-123.aws-services.com/graphql/";

const holipolyCloudRegexValidator = (url: string) =>
  /https:\/\/.*.holipoly.cloud\/graphql\//.test(url);

describe("validateAllowHolipolyUrls", () => {
  it("Passes any URL if allow list is empty", () => {
    expect(validateAllowHolipolyUrls(holipolyCloudUrlMock, [])).toBe(true);
    expect(validateAllowHolipolyUrls(onPremiseHolipolyUrlMock, [])).toBe(true);
  });

  it("Passes only for URL that was exactly matched in provided allow list array", () => {
    expect(validateAllowHolipolyUrls(holipolyCloudUrlMock, [holipolyCloudUrlMock])).toBe(true);
    expect(validateAllowHolipolyUrls(onPremiseHolipolyUrlMock, [holipolyCloudUrlMock])).toBe(false);
  });

  it("Validates against custom function provided to allow list", () => {
    expect(validateAllowHolipolyUrls(holipolyCloudUrlMock, [holipolyCloudRegexValidator])).toBe(
      true
    );
    expect(validateAllowHolipolyUrls(onPremiseHolipolyUrlMock, [holipolyCloudRegexValidator])).toBe(
      false
    );
  });

  it("Validates against more than one argument in allow list", () => {
    expect(
      validateAllowHolipolyUrls(holipolyCloudUrlMock, [
        holipolyCloudRegexValidator,
        onPremiseHolipolyUrlMock,
      ])
    ).toBe(true);
    expect(
      validateAllowHolipolyUrls(onPremiseHolipolyUrlMock, [
        holipolyCloudRegexValidator,
        onPremiseHolipolyUrlMock,
      ])
    ).toBe(true);
  });
});
