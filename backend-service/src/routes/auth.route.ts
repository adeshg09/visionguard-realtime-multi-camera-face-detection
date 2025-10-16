import { Hono } from "hono";
import type { PrismaClient } from "@prisma/client";
import { createAuthController } from "@/controllers/auth.controller.js";
import { authMiddleware } from "@/middlewares/auth.middleware.js";
import { validateBody } from "@/middlewares/validation.middleware.js";
import { loginSchema } from "@/validators/auth.validator.js";

export const createAuthRoutes = (prisma: PrismaClient) => {
  const authRouter = new Hono();
  const authController = createAuthController(prisma);

  // Public routes
  authRouter.post("/login", validateBody(loginSchema), authController.login);

  // Protected routes
  authRouter.get("/get-profile", authMiddleware, authController.getProfile);

  return authRouter;
};
