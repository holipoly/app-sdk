import { describe, expect, it, vi } from "vitest";

import { AuthData } from "./apl";
import { EnvAPL } from "./env-apl";

const getMockEnvVars = () => ({
  HOLIPOLY_APP_TOKEN: "some-token",
  HOLIPOLY_APP_ID: "app-id",
  HOLIPOLY_API_URL: "https://my-holipoly-instance.cloud/graphql/",
});

const getMockAuthData = (): AuthData => ({
  holipolyApiUrl: "https://my-holipoly-instance.cloud/graphql/",
  appId: "app-id",
  token: "some-token",
  jwks: "{}",
  domain: "my-holipoly-instance.cloud",
});

describe("EnvAPL", () => {
  it("Constructs when values are provided in constructor", () => {
    const envVars = getMockEnvVars();

    expect(
      new EnvAPL({
        env: {
          token: envVars.HOLIPOLY_APP_TOKEN,
          appId: envVars.HOLIPOLY_APP_ID,
          holipolyApiUrl: envVars.HOLIPOLY_API_URL,
        },
      })
    ).toBeDefined();
  });

  it("Prints auth data from \"set\" method in stdout if printAuthDataOnRegister set to \"true\"", async () => {
    const envVars = getMockEnvVars();

    vi.spyOn(console, "log");

    const mockAuthData = getMockAuthData();

    await new EnvAPL({
      env: {
        token: envVars.HOLIPOLY_APP_TOKEN,
        appId: envVars.HOLIPOLY_APP_ID,
        holipolyApiUrl: envVars.HOLIPOLY_API_URL,
      },
      printAuthDataOnRegister: true,
    }).set(mockAuthData);

    // eslint-disable-next-line no-console
    return expect(console.log).toHaveBeenNthCalledWith(
      2,
      /**
       * Assert stringified values for formatting
       */
      `{
  "holipolyApiUrl": "https://my-holipoly-instance.cloud/graphql/",
  "appId": "app-id",
  "token": "some-token",
  "jwks": "{}",
  "domain": "my-holipoly-instance.cloud"
}`
    );
  });

  it("Returns authData from constructor in get() and getAll()", async () => {
    const envVars = getMockEnvVars();

    const apl = new EnvAPL({
      env: {
        token: envVars.HOLIPOLY_APP_TOKEN,
        appId: envVars.HOLIPOLY_APP_ID,
        holipolyApiUrl: envVars.HOLIPOLY_API_URL,
      },
      printAuthDataOnRegister: true,
    });

    expect(await apl.get(envVars.HOLIPOLY_API_URL)).toEqual({
      token: envVars.HOLIPOLY_APP_TOKEN,
      appId: envVars.HOLIPOLY_APP_ID,
      holipolyApiUrl: envVars.HOLIPOLY_API_URL,
    });

    expect(await apl.getAll()).toEqual([
      {
        token: envVars.HOLIPOLY_APP_TOKEN,
        appId: envVars.HOLIPOLY_APP_ID,
        holipolyApiUrl: envVars.HOLIPOLY_API_URL,
      },
    ]);
  });
});
