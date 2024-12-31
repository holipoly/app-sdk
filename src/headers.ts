import {
  HOLIPOLY_API_URL_HEADER,
  HOLIPOLY_AUTHORIZATION_BEARER_HEADER,
  HOLIPOLY_DOMAIN_HEADER,
  HOLIPOLY_EVENT_HEADER,
  HOLIPOLY_SCHEMA_VERSION,
  HOLIPOLY_SIGNATURE_HEADER,
} from "./const";

const toStringOrUndefined = (value: string | string[] | undefined) =>
  value ? value.toString() : undefined;

const toFloatOrNull = (value: string | string[] | undefined) =>
  value ? parseFloat(value.toString()) : null;

/**
 * Extracts Holipoly-specific headers from the response.
 */
export const getHolipolyHeaders = (headers: { [name: string]: string | string[] | undefined }) => ({
  domain: toStringOrUndefined(headers[HOLIPOLY_DOMAIN_HEADER]),
  authorizationBearer: toStringOrUndefined(headers[HOLIPOLY_AUTHORIZATION_BEARER_HEADER]),
  signature: toStringOrUndefined(headers[HOLIPOLY_SIGNATURE_HEADER]),
  event: toStringOrUndefined(headers[HOLIPOLY_EVENT_HEADER]),
  holipolyApiUrl: toStringOrUndefined(headers[HOLIPOLY_API_URL_HEADER]),
  schemaVersion: toFloatOrNull(headers[HOLIPOLY_SCHEMA_VERSION]),
});

/**
 * Extracts the app's url from headers from the response.
 */
export const getBaseUrl = (headers: { [name: string]: string | string[] | undefined }): string => {
  const { host, "x-forwarded-proto": xForwardedProto = "http" } = headers;

  const xForwardedProtos = Array.isArray(xForwardedProto)
    ? xForwardedProto.join(",")
    : xForwardedProto;
  const protocols = xForwardedProtos.split(",");
  // prefer https over other protocols
  const protocol = protocols.find((el) => el === "https") || protocols[0];

  return `${protocol}://${host}`;
};
