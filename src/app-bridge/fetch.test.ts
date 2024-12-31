import { describe, expect, it, vi } from "vitest";

import { HOLIPOLY_AUTHORIZATION_BEARER_HEADER, HOLIPOLY_DOMAIN_HEADER } from "../const";
import { AppBridge } from "./app-bridge";
import { AppBridgeState } from "./app-bridge-state";
import { createAuthenticatedFetch } from "./fetch";

describe("createAuthenticatedFetch", () => {
  const mockedAppBridge: Pick<AppBridge, "getState"> = {
    getState(): AppBridgeState {
      return {
        domain: "master.staging.holipoly.cloud",
        token: "XXX_YYY",
        locale: "pl",
        path: "/",
        ready: true,
        theme: "light",
        holipolyApiUrl: "https://master.staging.holipoly.cloud/graphql/",
        id: "xyz1234",
      };
    },
  };

  it("Decorates request headers with AppBridge headers", async () => {
    const spiedFetch = vi.spyOn(global, "fetch");

    const fetchFn = createAuthenticatedFetch(mockedAppBridge);

    try {
      await fetchFn("/api/test");
    } catch (e) {
      // ignore
    }

    const fetchCallArguments = spiedFetch.mock.lastCall;
    const fetchCallHeaders = fetchCallArguments![1]?.headers;

    expect((fetchCallHeaders as Headers).get(HOLIPOLY_DOMAIN_HEADER)).toBe(
      "master.staging.holipoly.cloud"
    );
    expect((fetchCallHeaders as Headers).get(HOLIPOLY_AUTHORIZATION_BEARER_HEADER)).toBe("XXX_YYY");
  });

  it("Extends existing fetch config", async () => {
    const spiedFetch = vi.spyOn(global, "fetch");

    const fetchFn = createAuthenticatedFetch(mockedAppBridge);

    try {
      await fetchFn("/api/test", {
        headers: {
          foo: "bar",
        },
      });
    } catch (e) {
      // ignore
    }

    const fetchCallArguments = spiedFetch.mock.lastCall;
    const fetchCallHeaders = fetchCallArguments![1]?.headers;

    expect((fetchCallHeaders as Headers).get(HOLIPOLY_DOMAIN_HEADER)).toBe(
      "master.staging.holipoly.cloud"
    );
    expect((fetchCallHeaders as Headers).get(HOLIPOLY_AUTHORIZATION_BEARER_HEADER)).toBe("XXX_YYY");
    expect((fetchCallHeaders as Headers).get("foo")).toBe("bar");
  });
});