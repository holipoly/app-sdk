import crypto from "crypto";
import { Middleware } from "retes";
import { Response } from "retes/response";

import { HOLIPOLY_API_URL_HEADER, HOLIPOLY_SIGNATURE_HEADER } from "../const";
import { getHolipolyHeaders } from "../headers";
import { verifySignatureFromApiUrl } from "../verify-signature";
import { createMiddlewareDebug } from "./middleware-debug";

const debug = createMiddlewareDebug("withWebhookSignatureVerified");

const ERROR_MESSAGE = "Webhook signature verification failed:";

/**
 * TODO: Add test
 */
export const withWebhookSignatureVerified =
  (secretKey: string | undefined = undefined): Middleware =>
  (handler) =>
  async (request) => {
    debug("Middleware executing start");

    if (request.rawBody === undefined) {
      debug("Request rawBody was not found, will return Internal Server Error");

      return Response.InternalServerError({
        success: false,
        message: `${ERROR_MESSAGE} Request payload already parsed.`,
      });
    }

    const { signature: payloadSignature, holipolyApiUrl } = getHolipolyHeaders(request.headers);

    if (!payloadSignature) {
      debug("Signature header was not found");

      return Response.BadRequest({
        success: false,
        message: `${ERROR_MESSAGE} Missing ${HOLIPOLY_SIGNATURE_HEADER} header.`,
      });
    }

    if (!holipolyApiUrl) {
      return Response.BadRequest({
        success: false,
        message: `${ERROR_MESSAGE} Missing ${HOLIPOLY_API_URL_HEADER} header.`,
      });
    }

    if (secretKey !== undefined) {
      const calculatedSignature = crypto
        .createHmac("sha256", secretKey)
        .update(request.rawBody)
        .digest("hex");

      debug("Signature was calculated");

      if (calculatedSignature !== payloadSignature) {
        debug("Calculated signature doesn't match payload signature, will return Bad Request");

        return Response.BadRequest({
          success: false,
          message: `${ERROR_MESSAGE} Verification using secret key has failed.`,
        });
      }
    } else {
      try {
        await verifySignatureFromApiUrl(holipolyApiUrl, payloadSignature, request.rawBody);
        debug("JWKS verified");
      } catch {
        debug("JWKS verification failed");
        return Response.BadRequest({
          success: false,
          message: `${ERROR_MESSAGE} Verification using public key has failed.`,
        });
      }
    }

    return handler(request);
  };
