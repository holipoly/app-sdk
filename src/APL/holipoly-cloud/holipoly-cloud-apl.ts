import { SpanKind, SpanStatusCode, Tracer } from "@opentelemetry/api";
import { SemanticAttributes } from "@opentelemetry/semantic-conventions";

import { hasProp } from "../../has-prop";
import { getOtelTracer, OTEL_APL_SERVICE_NAME } from "../../open-telemetry";
import { APL, AplConfiguredResult, AplReadyResult, AuthData } from "../apl";
import { createAPLDebug } from "../apl-debug";
import { authDataFromObject } from "../auth-data-from-object";
import { CloudAplError, HolipolyCloudAplError } from "./holipoly-cloud-apl-errors";
import { Paginator } from "./paginator";

const debug = createAPLDebug("HolipolyCloudAPL");

export type HolipolyCloudAPLConfig = {
  resourceUrl: string;
  token: string;
  experimental?: {
    cacheManager?: Map<string, AuthData>;
  };
  pageLimit?: number;
};

type CloudAPLAuthDataShape = {
  holipoly_api_url: string;
  token: string;
  jwks: string;
  holipoly_app_id: string;
  domain: string;
};

export type GetAllAplResponseShape = {
  count: number;
  next: string | null;
  previous: string | null;
  results: CloudAPLAuthDataShape[];
};

const validateResponseStatus = (response: Response) => {
  if (!response.ok) {
    debug("Response failed with status %s", response.status);
    debug("%O", response);

    throw new HolipolyCloudAplError(
      CloudAplError.RESPONSE_NON_200,
      `Fetch returned with non 200 status code ${response.status}`
    );
  }
};

const mapAuthDataToAPIBody = (authData: AuthData) => ({
  holipoly_app_id: authData.appId,
  holipoly_api_url: authData.holipolyApiUrl,
  jwks: authData.jwks,
  domain: authData.domain,
  token: authData.token,
});

const mapAPIResponseToAuthData = (response: CloudAPLAuthDataShape): AuthData => ({
  appId: response.holipoly_app_id,
  domain: response.domain,
  jwks: response.jwks,
  holipolyApiUrl: response.holipoly_api_url,
  token: response.token,
});

const extractErrorMessage = (error: unknown): string => {
  if (typeof error === "string") {
    return error;
  }

  if (hasProp(error, "message")) {
    return error.message as string;
  }

  return "Unknown error";
};

/**
 *
 * Holipoly Cloud APL - handle auth data management via REST API.
 *
 * Required configuration options:
 * - `resourceUrl` URL to the REST API
 * - `token` Authorization token assigned to your deployment
 *
 */
export class HolipolyCloudAPL implements APL {
  private readonly resourceUrl: string;

  private headers: Record<string, string>;

  private tracer: Tracer;

  private cacheManager?: Map<string, AuthData>;

  private readonly pageLimit: number;

  constructor(config: HolipolyCloudAPLConfig) {
    this.resourceUrl = config.resourceUrl;
    this.headers = {
      Authorization: `Bearer ${config.token}`,
    };

    this.tracer = getOtelTracer();
    this.cacheManager = config?.experimental?.cacheManager;
    this.pageLimit = config.pageLimit ?? 1000;
  }

  private getUrlForDomain(holipolyApiUrl: string) {
    // API URL has to be base64url encoded
    return `${this.resourceUrl}/${Buffer.from(holipolyApiUrl).toString("base64url")}`;
  }

  private getUrlWithLimit() {
    return `${this.resourceUrl}?limit=${this.pageLimit}`;
  }

  private setToCacheIfExists(holipolyApiUrl: string, authData: AuthData) {
    if (!this.cacheManager) {
      return;
    }

    this.cacheManager.set(authData.holipolyApiUrl, authData);
  }

  private deleteFromCacheIfExists(holipolyApiUrl: string) {
    if (!this.cacheManager) {
      return;
    }

    this.cacheManager.delete(holipolyApiUrl);
  }

  private getFromCacheIfExists(holipolyApiUrl: string) {
    return this.cacheManager?.get(holipolyApiUrl);
  }

  async get(holipolyApiUrl: string): Promise<AuthData | undefined> {
    const cachedData = this.getFromCacheIfExists(holipolyApiUrl);

    if (cachedData) {
      debug("Returning authData from cache for holipolyApiUrl %s", holipolyApiUrl);
      return cachedData;
    }

    debug("Will fetch data from HolipolyCloudAPL for holipolyApiUrl %s", holipolyApiUrl);

    return this.tracer.startActiveSpan(
      "HolipolyCloudAPL.get",
      {
        attributes: {
          holipolyApiUrl,
          [SemanticAttributes.PEER_SERVICE]: OTEL_APL_SERVICE_NAME,
        },
        kind: SpanKind.CLIENT,
      },
      async (span) => {
        const response = await fetch(this.getUrlForDomain(holipolyApiUrl), {
          method: "GET",
          headers: { "Content-Type": "application/json", ...this.headers },
        }).catch((error) => {
          debug("Failed to reach API call:  %s", extractErrorMessage(error));
          debug("%O", error);

          span.recordException(CloudAplError.FAILED_TO_REACH_API);
          span
            .setStatus({
              code: SpanStatusCode.ERROR,
              message: extractErrorMessage(error),
            })
            .end();

          throw new HolipolyCloudAplError(
            CloudAplError.FAILED_TO_REACH_API,
            `${extractErrorMessage(error)}`
          );
        });

        if (!response) {
          debug("No response from the API");

          span.recordException(CloudAplError.FAILED_TO_REACH_API);
          span
            .setStatus({
              code: SpanStatusCode.ERROR,
              message: "Response couldn't be resolved",
            })
            .end();

          throw new HolipolyCloudAplError(
            CloudAplError.FAILED_TO_REACH_API,
            "Response couldn't be resolved"
          );
        }

        if (response.status >= 500) {
          const message = `Api responded with ${response.status}`;

          span.recordException(CloudAplError.FAILED_TO_REACH_API);
          span
            .setStatus({
              code: SpanStatusCode.ERROR,
              message,
            })
            .end();

          throw new HolipolyCloudAplError(CloudAplError.FAILED_TO_REACH_API, message);
        }

        if (response.status === 404) {
          debug("No auth data for given holipolyApiUrl");

          span.addEvent("Missing auth data for given holipolyApiUrl");
          span
            .setStatus({
              code: SpanStatusCode.OK,
            })
            .end();

          return undefined;
        }

        const parsedResponse = (await response.json().catch((e) => {
          debug("Failed to parse response: %s", extractErrorMessage(e));
          debug("%O", e);

          const message = `Cant parse response body: ${extractErrorMessage(e)}`;

          span.recordException(CloudAplError.RESPONSE_BODY_INVALID);
          span
            .setStatus({
              code: SpanStatusCode.ERROR,
              message,
            })
            .end();

          throw new HolipolyCloudAplError(CloudAplError.RESPONSE_BODY_INVALID, message);
        })) as CloudAPLAuthDataShape;

        const authData = authDataFromObject(mapAPIResponseToAuthData(parsedResponse));

        if (!authData) {
          debug("No auth data for given holipolyApiUrl");

          span.addEvent("Missing auth data for given holipolyApiUrl");
          span
            .setStatus({
              code: SpanStatusCode.OK,
            })
            .end();

          return undefined;
        }

        span.setAttribute("appId", authData.appId);

        this.setToCacheIfExists(authData.holipolyApiUrl, authData);

        span
          .setStatus({
            code: SpanStatusCode.OK,
          })
          .end();

        return authData;
      }
    );
  }

  async set(authData: AuthData) {
    debug("Saving data to HolipolyCloudAPL for holipolyApiUrl: %s", authData.holipolyApiUrl);

    return this.tracer.startActiveSpan(
      "HolipolyCloudAPL.set",
      {
        attributes: {
          holipolyApiUrl: authData.holipolyApiUrl,
          appId: authData.appId,
          [SemanticAttributes.PEER_SERVICE]: OTEL_APL_SERVICE_NAME,
        },
        kind: SpanKind.CLIENT,
      },
      async (span) => {
        const response = await fetch(this.resourceUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...this.headers },
          body: JSON.stringify(mapAuthDataToAPIBody(authData)),
        }).catch((e) => {
          debug("Failed to reach API call:  %s", extractErrorMessage(e));
          debug("%O", e);

          span.recordException(`Failed to reach API call:  ${extractErrorMessage(e)}`);
          span
            .setStatus({
              code: SpanStatusCode.ERROR,
            })
            .end();

          throw new HolipolyCloudAplError(
            CloudAplError.ERROR_SAVING_DATA,
            `Error during saving the data: ${extractErrorMessage(e)}`
          );
        });

        validateResponseStatus(response);

        debug("Set command finished successfully for holipolyApiUrl: %", authData.holipolyApiUrl);

        this.setToCacheIfExists(authData.holipolyApiUrl, authData);

        span.setStatus({
          code: SpanStatusCode.OK,
        });
        span.end();

        return undefined;
      }
    );
  }

  async delete(holipolyApiUrl: string) {
    debug("Deleting data from HolipolyCloud for holipolyApiUrl: %s", holipolyApiUrl);

    try {
      const response = await fetch(this.getUrlForDomain(holipolyApiUrl), {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...this.headers },
      });

      this.deleteFromCacheIfExists(holipolyApiUrl);

      debug(`Delete responded with ${response.status} code`);
    } catch (error) {
      const errorMessage = extractErrorMessage(error);

      debug("Error during deleting the data: %s", errorMessage);
      debug("%O", error);

      throw new HolipolyCloudAplError(
        CloudAplError.ERROR_DELETING_DATA,
        `Error during deleting the data: ${errorMessage}`
      );
    }
  }

  async getAll() {
    debug("Get all data from HolipolyCloud");

    try {
      const paginator = new Paginator<CloudAPLAuthDataShape>(this.getUrlWithLimit(), {
        method: "GET",
        headers: { "Content-Type": "application/json", ...this.headers },
      });
      const responses = await paginator.fetchAll();
      return responses.results.map(mapAPIResponseToAuthData);
    } catch (error) {
      const errorMessage = extractErrorMessage(error);

      debug("Error during getting all the data:", errorMessage);
      debug("%O", error);
    }

    return [];
  }

  async isReady(): Promise<AplReadyResult> {
    const configured = await this.isConfigured();

    return configured
      ? {
          ready: true,
        }
      : {
          ready: false,
          error: new Error("HolipolyCloudAPL is not configured"),
        };
  }

  async isConfigured(): Promise<AplConfiguredResult> {
    if (!this.resourceUrl) {
      debug("Resource URL has not been specified.");
      return {
        configured: false,
        error: new Error("HolipolyCloudAPL required resourceUrl param"),
      };
    }

    return {
      configured: true,
    };
  }
}
