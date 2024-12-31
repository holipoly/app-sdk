import { Middleware } from "retes";
import { Response } from "retes/response";

import { getHolipolyHeaders } from "../headers";
import { createMiddlewareDebug } from "./middleware-debug";

const debug = createMiddlewareDebug("withHolipolyDomainPresent");

export const withHolipolyDomainPresent: Middleware = (handler) => async (request) => {
  const { domain } = getHolipolyHeaders(request.headers);

  debug("Middleware called with domain in header: %s", domain);

  if (!domain) {
    debug("Domain not found in header, will respond with Bad Request");

    return Response.BadRequest({
      success: false,
      message: "Missing Holipoly domain header.",
    });
  }

  return handler(request);
};
