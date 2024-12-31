import { Middleware, Request } from "retes";

import { HolipolyApp } from "../holipoly-app";
import { createMiddlewareDebug } from "./middleware-debug";

const debug = createMiddlewareDebug("withHolipolyApp");

export const withHolipolyApp =
  (holipolyApp: HolipolyApp): Middleware =>
  (handler) =>
  async (request) => {
    debug("Middleware called");

    request.context ??= {};
    request.context.holipolyApp = holipolyApp;

    return handler(request);
  };

export const getHolipolyAppFromRequest = (request: Request): HolipolyApp | undefined =>
  request.context?.holipolyApp;
