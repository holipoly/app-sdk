import { Middleware } from "retes";
import { Response } from "retes/response";

import { getHolipolyHeaders } from "../headers";
import { createMiddlewareDebug } from "./middleware-debug";
import { getHolipolyAppFromRequest } from "./with-holipoly-app";

const debug = createMiddlewareDebug("withRegisteredHolipolyDomainHeader");

export const withRegisteredHolipolyDomainHeader: Middleware = (handler) => async (request) => {
  const { holipolyApiUrl } = getHolipolyHeaders(request.headers);

  if (!holipolyApiUrl) {
    return Response.BadRequest({
      success: false,
      message: "holipolyApiUrl header missing.",
    });
  }

  debug("Middleware called with holipolyApiUrl: \"%s\"", holipolyApiUrl);

  const holipolyApp = getHolipolyAppFromRequest(request);

  if (!holipolyApp) {
    console.error(
      "HolipolyApp not found in request context. Ensure your API handler is wrapped with withHolipolyApp middleware"
    );

    return Response.InternalServerError({
      success: false,
      message: "HolipolyApp is misconfigured",
    });
  }

  const authData = await holipolyApp?.apl.get(holipolyApiUrl);

  if (!authData) {
    debug("Auth was not found in APL, will respond with Forbidden status");

    return Response.Forbidden({
      success: false,
      message: `Holipoly: ${holipolyApiUrl} not registered.`,
    });
  }

  return handler(request);
};
