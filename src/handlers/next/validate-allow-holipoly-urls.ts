import { CreateAppRegisterHandlerOptions } from "./create-app-register-handler";

export const validateAllowHolipolyUrls = (
  holipolyApiUrl: string,
  allowedUrls: CreateAppRegisterHandlerOptions["allowedHolipolyUrls"]
) => {
  if (!allowedUrls || allowedUrls.length === 0) {
    return true;
  }

  for (const urlOrFn of allowedUrls) {
    if (typeof urlOrFn === "string" && urlOrFn === holipolyApiUrl) {
      return true;
    }

    if (typeof urlOrFn === "function" && urlOrFn(holipolyApiUrl)) {
      return true;
    }
  }

  return false;
};
