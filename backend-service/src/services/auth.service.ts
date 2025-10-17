import { PrismaClient } from "@prisma/client";
import { RESPONSE_ERROR_MESSAGES } from "@/constants/index.js";
import {
  GetProfileResponse,
  LoginRequest,
  LoginResponse,
  Tokens,
} from "@/dtos/auth.dto.js";
import { logger } from "@/libs/logger.lib.js";
import { comparePassword } from "@/utils/password.js";
import { generateTokens } from "@/utils/tokens.js";

export const createAuthService = (prisma: PrismaClient) => {
  const login = async (loginData: LoginRequest): Promise<LoginResponse> => {
    try {
      const user = await prisma.user.findUnique({
        where: { username: loginData.username },
      });

      if (!user) {
        throw new Error(RESPONSE_ERROR_MESSAGES.INVALID_CREDENTIALS);
      }

      const isPasswordValid = await comparePassword(
        loginData.password,
        user.password
      );

      if (!isPasswordValid) {
        throw new Error(RESPONSE_ERROR_MESSAGES.INVALID_CREDENTIALS);
      }

      const tokens: Tokens = generateTokens(user);

      logger.info(`User ${user.username} logged in successfully`);

      return {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
        tokens: tokens,
      };
    } catch (error) {
      logger.error("Login error:", error);
      throw error;
    }
  };

  const getProfile = async (userId: string): Promise<GetProfileResponse> => {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        // isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new Error(RESPONSE_ERROR_MESSAGES.USER_NOT_FOUND);
    }

    return user;
  };

  return {
    login,
    getProfile,
  };
};
