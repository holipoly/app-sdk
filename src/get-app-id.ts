import { createDebug } from "./debug";

const debug = createDebug("getAppId");

type GetIdResponseType = {
  data?: {
    app?: {
      id: string;
    };
  };
};

export interface GetAppIdProperties {
  holipolyApiUrl: string;
  token: string;
}

export const getAppId = async ({
  holipolyApiUrl,
  token,
}: GetAppIdProperties): Promise<string | undefined> => {
  try {
    const response = await fetch(holipolyApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: `
        {
          app{
            id
          }
        }
        `,
      }),
    });
    if (response.status !== 200) {
      debug(`Could not get the app ID: Holipoly API has response code ${response.status}`);
      return undefined;
    }
    const body = (await response.json()) as GetIdResponseType;
    const appId = body.data?.app?.id;
    return appId;
  } catch (e) {
    debug("Could not get the app ID: %O", e);
    return undefined;
  }
};
