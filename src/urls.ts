export const getJwksUrlFromHolipolyApiUrl = (holipolyApiUrl: string): string =>
  `${new URL(holipolyApiUrl).origin}/.well-known/jwks.json`;
