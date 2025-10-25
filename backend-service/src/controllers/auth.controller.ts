/* Imports */
import type { Context } from "hono";

/* Relative Imports */
import { PrismaClient } from "@prisma/client";

/* Local Imports */
import { successResponse, errorResponse } from "@/utils/response.js";
import {
  RESPONSE_ERROR_MESSAGES,
  RESPONSE_MESSAGES,
  RESPONSE_SUCCESS_MESSAGES,
  STATUS_CODES,
} from "@/constants/index.js";
import type { LoginRequest } from "@/dtos/auth.dto.js";
import { createAuthService } from "@/services/auth.service.js";

// ----------------------------------------------------------------------

/**
 * Controller to handle all auth-related operations.
 *
 * @param {PrismaClient} prisma - Prisma client instance
 * @returns {object} - Auth controller with all handlers
 */

export const createAuthController = (prisma: PrismaClient) => {
  /* Services */
  const authService = createAuthService(prisma);

  // ----------------------------------------------------------------------

  /**
   * Login a user.
   *
   * @route POST /api/auth/login
   */

  const login = async (c: Context) => {
    try {
      const loginData = c.get("validatedData") as LoginRequest;
      const result = await authService.login(loginData);

      return successResponse(
        c,
        STATUS_CODES.OK,
        RESPONSE_MESSAGES.SUCCESS,
        RESPONSE_SUCCESS_MESSAGES.LOGIN_SUCCESS,
        result
      );
    } catch (error) {
      return errorResponse(
        c,
        STATUS_CODES.UNAUTHORIZED,
        RESPONSE_MESSAGES.UNAUTHORIZED,
        error
      );
    }
  };

  /**
   * Get user profile.
   *
   * @route GET /api/auth/get-profile
   */
  const getProfile = async (c: Context) => {
    try {
      const user = c.get("user");

      const profile = await authService.getProfile(user.id);

      return successResponse(
        c,
        STATUS_CODES.OK,
        RESPONSE_MESSAGES.SUCCESS,
        RESPONSE_SUCCESS_MESSAGES.USER_INFO_FETCHED,
        profile
      );
    } catch (error) {
      return errorResponse(
        c,
        STATUS_CODES.BAD_REQUEST,
        RESPONSE_ERROR_MESSAGES.USER_INFO_ERROR,
        error
      );
    }
  };

  // ----------------------------------------------------------------------

  /* Return all controller functions */
  return {
    login,
    getProfile,
  };
};
