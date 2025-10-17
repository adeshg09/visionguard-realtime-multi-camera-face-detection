/* Imports */
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import { envConfig } from "@/config/envConfig";
// ----------------------------------------------------------------------

/**
 * function to set access token in cookies
 *
 * @param {string} accessToken - logged in user token
 * @param {boolean} isRememberMe - flag to remember/forgot user after session ends.
 * @returns {void}
 */

export const setAccessToken = (
  accessToken: string,
  isRememberMe?: boolean
): void => {
  const cookieConfig: Cookies.CookieAttributes = {
    path: "/",
    sameSite: "strict",
  };
  const expiresDate = new Date(); // Now
  if (isRememberMe) {
    expiresDate.setDate(expiresDate.getDate() + 30); // Set now + 30 days as the new date

    cookieConfig.expires = expiresDate;
  } else {
    expiresDate.setDate(expiresDate.getDate() + 1); // Set now + 1 days as the new date
    cookieConfig.expires = expiresDate;
  }
  Cookies.set(envConfig.accessTokenKey, accessToken, cookieConfig);
};

/**
 * function to remove access token from cookies
 *
 * @returns {void}
 */
export const removeAccessToken = (): void => {
  const cookieConfig: Cookies.CookieAttributes = {
    path: "/",
    sameSite: "strict",
    expires: 0,
  };
  Cookies.remove(envConfig.accessTokenKey, cookieConfig);
};

/**
 * function to get access token from cookies
 *
 * @returns {string} - returns a access token from cookies
 */
export const getAccessToken = (): string | undefined => {
  return Cookies.get(envConfig.accessTokenKey);
};

/**
 * function to validate the access token by decoding the jwt token
 * @param {string} accessToken - logged in user token
 *
 * @returns {string} - returns a access token from cookies
 */
export const isValidToken = (
  accessToken: string
): { exp: number } | undefined => {
  if (!accessToken) {
    return;
  }
  const decoded = jwtDecode(accessToken) as { exp: number };
  const currentTime = Date.now() / 1000;

  return decoded?.exp > currentTime ? decoded : undefined;
};
