/* Relative Imports */
import jwt, { type SignOptions } from "jsonwebtoken";

/* Local Imports */
import { TOKEN_EXPIRY } from "@/constants/index.js";
import { Tokens, TokenPayload } from "@/dtos/auth.dto.js";

// ----------------------------------------------------------------------

/**
 * Generates an access token and a refresh token for the given user.
 * If rememberMe is true, the refresh token will have a longer expiry time.
 * @param {any} user - The user object to generate tokens for.
 * @param {boolean} [rememberMe=false] - Whether to generate a refresh token with a longer expiry time.
 * @returns {Tokens} - An object containing the access token and the refresh token.
 */
export const generateTokens = (user: any, rememberMe?: boolean): Tokens => {
  const accessToken = jwt.sign(
    { userId: user.id, role: user.role },
    process.env.ACCESS_TOKEN_SECRET as string,
    { expiresIn: TOKEN_EXPIRY.ACCESS } as SignOptions
  );

  const refreshToken = jwt.sign(
    { userId: user.id, role: user.role },
    process.env.REFRESH_TOKEN_SECRET as string,
    {
      expiresIn: rememberMe ? TOKEN_EXPIRY.REMEMBER_ME : TOKEN_EXPIRY.REFRESH,
    } as SignOptions
  );

  return { accessToken, refreshToken };
};

/**
 * Verifies the given token against the given secret.
 * @param {string} token - The token to verify.
 * @param {string} secret - The secret to use for verification.
 * @returns {TokenPayload | null} - The decoded token payload if verification is successful, otherwise null.
 */
export const verifyToken = (
  token: string,
  secret: string
): TokenPayload | null => {
  try {
    const decoded = jwt.verify(token, secret) as TokenPayload;
    return decoded;
  } catch (error) {
    return null;
  }
};
