import type { Handler, Request } from "retes";
import { toNextHandler } from "retes/adapter";
import { withMethod } from "retes/middleware";
import { Response } from "retes/response";

import { AuthData } from "../../APL";
import { HOLIPOLY_API_URL_HEADER, HOLIPOLY_DOMAIN_HEADER } from "../../const";
import { createDebug } from "../../debug";
import { fetchRemoteJwks } from "../../fetch-remote-jwks";
import { getAppId } from "../../get-app-id";
import { HasAPL } from "../../holipoly-app";
import { withAuthTokenRequired, withHolipolyDomainPresent } from "../../middleware";
import { validateAllowHolipolyUrls } from "./validate-allow-holipoly-urls";

const debug = createDebug("createAppRegisterHandler");

type HookCallbackErrorParams = {
  status?: number;
  message?: string;
};

class RegisterCallbackError extends Error {
  public status = 500;

  constructor(errorParams: HookCallbackErrorParams) {
    super(errorParams.message);

    if (errorParams.status) {
      this.status = errorParams.status;
    }
  }
}

const createCallbackError = (params: HookCallbackErrorParams) => {
  throw new RegisterCallbackError(params);
};

export type RegisterHandlerResponseBody = {
  success: boolean;
  error?: {
    code?: string;
    message?: string;
  };
};
export const createRegisterHandlerResponseBody = (
  success: boolean,
  error?: RegisterHandlerResponseBody["error"]
): RegisterHandlerResponseBody => ({
  success,
  error,
});

const handleHookError = (e: RegisterCallbackError | unknown) => {
  if (e instanceof RegisterCallbackError) {
    return new Response(
      createRegisterHandlerResponseBody(false, {
        code: "REGISTER_HANDLER_HOOK_ERROR",
        message: e.message,
      }),
      { status: e.status }
    );
  }
  return Response.InternalServerError("Error during app installation");
};

export type CreateAppRegisterHandlerOptions = HasAPL & {
  /**
   * Protect app from being registered in Holipoly other than specific.
   * By default, allow everything.
   *
   * Provide array of  either a full Holipoly API URL (eg. my-shop.holipoly.cloud/graphql/)
   * or a function that receives a full Holipoly API URL ad returns true/false.
   */
  allowedHolipolyUrls?: Array<string | ((holipolyApiUrl: string) => boolean)>;
  /**
   * Run right after Holipoly calls this endpoint
   */
  onRequestStart?(
    request: Request,
    context: {
      authToken?: string;
      holipolyDomain?: string;
      holipolyApiUrl?: string;
      respondWithError: typeof createCallbackError;
    }
  ): Promise<void>;
  /**
   * Run after all security checks
   */
  onRequestVerified?(
    request: Request,
    context: {
      authData: AuthData;
      respondWithError: typeof createCallbackError;
    }
  ): Promise<void>;
  /**
   * Run after APL successfully AuthData, assuming that APL.set will reject a Promise in case of error
   */
  onAuthAplSaved?(
    request: Request,
    context: {
      authData: AuthData;
      respondWithError: typeof createCallbackError;
    }
  ): Promise<void>;
  /**
   * Run after APL fails to set AuthData
   */
  onAplSetFailed?(
    request: Request,
    context: {
      authData: AuthData;
      error: unknown;
      respondWithError: typeof createCallbackError;
    }
  ): Promise<void>;
};

/**
 * Creates API handler for Next.js. Creates handler called by Holipoly that registers app.
 * Hides implementation details if possible
 * In the future this will be extracted to separate sdk/next package
 */
export const createAppRegisterHandler = ({
  apl,
  allowedHolipolyUrls,
  onAplSetFailed,
  onAuthAplSaved,
  onRequestVerified,
  onRequestStart,
}: CreateAppRegisterHandlerOptions) => {
  const baseHandler: Handler = async (request) => {
    debug("Request received");

    const authToken = request.params.auth_token;
    const holipolyDomain = request.headers[HOLIPOLY_DOMAIN_HEADER] as string;
    const holipolyApiUrl = request.headers[HOLIPOLY_API_URL_HEADER] as string;

    if (onRequestStart) {
      debug("Calling \"onRequestStart\" hook");

      try {
        await onRequestStart(request, {
          authToken,
          holipolyApiUrl,
          holipolyDomain,
          respondWithError: createCallbackError,
        });
      } catch (e: RegisterCallbackError | unknown) {
        debug("\"onRequestStart\" hook thrown error: %o", e);

        return handleHookError(e);
      }
    }

    if (!holipolyApiUrl) {
      debug("holipolyApiUrl doesnt exist in headers");
    }

    if (!validateAllowHolipolyUrls(holipolyApiUrl, allowedHolipolyUrls)) {
      debug(
        "Validation of URL %s against allowHolipolyUrls param resolves to false, throwing",
        holipolyApiUrl
      );

      return Response.Forbidden(
        createRegisterHandlerResponseBody(false, {
          code: "HOLIPOLY_URL_PROHIBITED",
          message: "This app expects to be installed only in allowed Holipoly instances",
        })
      );
    }

    const { configured: aplConfigured } = await apl.isConfigured();

    if (!aplConfigured) {
      debug("The APL has not been configured");

      return new Response(
        createRegisterHandlerResponseBody(false, {
          code: "APL_NOT_CONFIGURED",
          message: "APL_NOT_CONFIGURED. App is configured properly. Check APL docs for help.",
        }),
        {
          status: 503,
        }
      );
    }

    // Try to get App ID from the API, to confirm that communication can be established
    const appId = await getAppId({ holipolyApiUrl, token: authToken });
    if (!appId) {
      return new Response(
        createRegisterHandlerResponseBody(false, {
          code: "UNKNOWN_APP_ID",
          message: `The auth data given during registration request could not be used to fetch app ID. 
          This usually means that App could not connect to Holipoly during installation. Holipoly URL that App tried to connect: ${holipolyApiUrl}`,
        }),
        {
          status: 401,
        }
      );
    }

    // Fetch the JWKS which will be used during webhook validation
    const jwks = await fetchRemoteJwks(holipolyApiUrl);
    if (!jwks) {
      return new Response(
        createRegisterHandlerResponseBody(false, {
          code: "JWKS_NOT_AVAILABLE",
          message: "Can't fetch the remote JWKS.",
        }),
        {
          status: 401,
        }
      );
    }

    const authData = {
      domain: holipolyDomain,
      token: authToken,
      holipolyApiUrl,
      appId,
      jwks,
    };

    if (onRequestVerified) {
      debug("Calling \"onRequestVerified\" hook");

      try {
        await onRequestVerified(request, {
          authData,
          respondWithError: createCallbackError,
        });
      } catch (e: RegisterCallbackError | unknown) {
        debug("\"onRequestVerified\" hook thrown error: %o", e);

        return handleHookError(e);
      }
    }

    try {
      await apl.set(authData);

      if (onAuthAplSaved) {
        debug("Calling \"onAuthAplSaved\" hook");

        try {
          await onAuthAplSaved(request, {
            authData,
            respondWithError: createCallbackError,
          });
        } catch (e: RegisterCallbackError | unknown) {
          debug("\"onAuthAplSaved\" hook thrown error: %o", e);

          return handleHookError(e);
        }
      }
    } catch (aplError: unknown) {
      debug("There was an error during saving the auth data");

      if (onAplSetFailed) {
        debug("Calling \"onAuthAplFailed\" hook");

        try {
          await onAplSetFailed(request, {
            authData,
            error: aplError,
            respondWithError: createCallbackError,
          });
        } catch (hookError: RegisterCallbackError | unknown) {
          debug("\"onAuthAplFailed\" hook thrown error: %o", hookError);

          return handleHookError(hookError);
        }
      }

      return Response.InternalServerError(
        createRegisterHandlerResponseBody(false, {
          message: "Registration failed: could not save the auth data.",
        })
      );
    }

    debug("Register  complete");

    return Response.OK(createRegisterHandlerResponseBody(true));
  };

  return toNextHandler([
    withMethod("POST"),
    withHolipolyDomainPresent,
    withAuthTokenRequired,
    baseHandler,
  ]);
};