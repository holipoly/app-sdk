import { SpanKind, SpanStatusCode } from "@opentelemetry/api";
import { NextApiRequest } from "next";

import { APL } from "../../APL";
import { createDebug } from "../../debug";
import { getBaseUrl, getHolipolyHeaders } from "../../headers";
import { getOtelTracer } from "../../open-telemetry";
import { Permission } from "../../types";
import { extractUserFromJwt } from "../../util/extract-user-from-jwt";
import { verifyJWT } from "../../verify-jwt";
import { ProtectedHandlerContext } from "./protected-handler-context";

const debug = createDebug("processProtectedHandler");

export type HolipolyProtectedHandlerError =
  | "OTHER"
  | "MISSING_HOST_HEADER"
  | "MISSING_DOMAIN_HEADER"
  | "MISSING_API_URL_HEADER"
  | "MISSING_AUTHORIZATION_BEARER_HEADER"
  | "NOT_REGISTERED"
  | "JWT_VERIFICATION_FAILED"
  | "NO_APP_ID";

export class ProtectedHandlerError extends Error {
  errorType: HolipolyProtectedHandlerError = "OTHER";

  constructor(message: string, errorType: HolipolyProtectedHandlerError) {
    super(message);
    if (errorType) {
      this.errorType = errorType;
    }
    Object.setPrototypeOf(this, ProtectedHandlerError.prototype);
  }
}

interface ProcessHolipolyProtectedHandlerArgs {
  req: Pick<NextApiRequest, "headers">;
  apl: APL;
  requiredPermissions?: Permission[];
}

type ProcessAsyncHolipolyProtectedHandler = (
  props: ProcessHolipolyProtectedHandlerArgs
) => Promise<ProtectedHandlerContext>;

/**
 * Perform security checks on given request and return ProtectedHandlerContext object.
 * In case of validation issues, instance of the ProtectedHandlerError will be thrown.
 *
 * Can pass entire next request or Headers with holipolyApiUrl and token
 */
export const processHolipolyProtectedHandler: ProcessAsyncHolipolyProtectedHandler = async ({
  req,
  apl,
  requiredPermissions,
}: ProcessHolipolyProtectedHandlerArgs): Promise<ProtectedHandlerContext> => {
  const tracer = getOtelTracer();

  return tracer.startActiveSpan(
    "processHolipolyProtectedHandler",
    {
      kind: SpanKind.INTERNAL,
      attributes: {
        requiredPermissions,
      },
    },
    async (span) => {
      debug("Request processing started");

      const { holipolyApiUrl, authorizationBearer: token } = getHolipolyHeaders(req.headers);

      const baseUrl = getBaseUrl(req.headers);

      span.setAttribute("holipolyApiUrl", holipolyApiUrl ?? "");

      if (!baseUrl) {
        span
          .setStatus({
            code: SpanStatusCode.ERROR,
            message: "Missing host header",
          })
          .end();

        debug("Missing host header");

        throw new ProtectedHandlerError("Missing host header", "MISSING_HOST_HEADER");
      }

      if (!holipolyApiUrl) {
        span
          .setStatus({
            code: SpanStatusCode.ERROR,
            message: "Missing holipoly-api-url header",
          })
          .end();

        debug("Missing holipoly-api-url header");

        throw new ProtectedHandlerError(
          "Missing holipoly-api-url header",
          "MISSING_API_URL_HEADER"
        );
      }

      if (!token) {
        span
          .setStatus({
            code: SpanStatusCode.ERROR,
            message: "Missing authorization-bearer header",
          })
          .end();

        debug("Missing authorization-bearer header");

        throw new ProtectedHandlerError(
          "Missing authorization-bearer header",
          "MISSING_AUTHORIZATION_BEARER_HEADER"
        );
      }

      // Check if API URL has been registered in the APL
      const authData = await apl.get(holipolyApiUrl);

      if (!authData) {
        span
          .setStatus({
            code: SpanStatusCode.ERROR,
            message: "APL didn't found auth data for API URL",
          })
          .end();

        debug("APL didn't found auth data for API URL %s", holipolyApiUrl);

        throw new ProtectedHandlerError(
          `Can't find auth data for holipolyApiUrl ${holipolyApiUrl}. Please register the application`,
          "NOT_REGISTERED"
        );
      }

      try {
        await verifyJWT({ appId: authData.appId, token, holipolyApiUrl, requiredPermissions });
      } catch (e) {
        span
          .setStatus({
            code: SpanStatusCode.ERROR,
            message: "JWT verification failed",
          })
          .end();

        throw new ProtectedHandlerError("JWT verification failed: ", "JWT_VERIFICATION_FAILED");
      }

      const userJwtPayload = extractUserFromJwt(token);

      span.end();

      return {
        baseUrl,
        authData,
        user: userJwtPayload,
      };
    }
  );
};
