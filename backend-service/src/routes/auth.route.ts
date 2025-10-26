/* Imports */
import { Hono } from "hono";

/* Relative Imports */
import type { PrismaClient } from "@prisma/client";

/* Local Imports */
import { createAuthController } from "@/controllers/auth.controller.js";
import { authMiddleware } from "@/middlewares/auth.middleware.js";
import { validateBody } from "@/middlewares/validation.middleware.js";
import { loginSchema } from "@/validators/auth.validator.js";

// ----------------------------------------------------------------------

/**
 * Creates routes for auth-related operations.
 *
 * @param {PrismaClient} prisma - Prisma client instance
 * @returns {object} - Auth routes with all handlers
 */

export const createAuthRoutes = (prisma: PrismaClient) => {
  /* Routes */
  const authRouter = new Hono();

  /* Controller */
  const authController = createAuthController(prisma);

  /* Auth routes */
  // Public routes
  authRouter.post("/login", validateBody(loginSchema), authController.login);

  // Protected routes
  authRouter.get("/get-profile", authMiddleware, authController.getProfile);

  return authRouter;
};
