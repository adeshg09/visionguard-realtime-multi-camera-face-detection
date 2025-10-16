import jwt, { type SignOptions } from "jsonwebtoken";
import { TOKEN_EXPIRY } from "@/constants/index.js";
import { Tokens, TokenPayload } from "@/dtos/auth.dto.js";

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
