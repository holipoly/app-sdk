import { Middleware } from "retes";
import { Response } from "retes/response";

import { getHolipolyHeaders } from "../headers";
import { createMiddlewareDebug } from "./middleware-debug";

const debug = createMiddlewareDebug("withHolipolyEventMatch");

export const withHolipolyEventMatch =
  <E extends string>(expectedEvent: `${Lowercase<E>}`): Middleware =>
  (handler) =>
  async (request) => {
    const { event } = getHolipolyHeaders(request.headers);

    debug("Middleware called with even header: \"%s\"", event);

    if (event !== expectedEvent) {
      debug(
        "Event from header (%s) doesnt match expected (%s). Will respond with Bad Request",
        event,
        expectedEvent
      );

      return Response.BadRequest({
        success: false,
        message: `Invalid Holipoly event. Expecting ${expectedEvent}.`,
      });
    }

    return handler(request);
  };
