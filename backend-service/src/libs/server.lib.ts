import { envConfig } from "@/config/env.config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";

export const createServer = (): Hono => {
  const app = new Hono();

  // Global middlewares
  app.use(
    "*",
    cors({
      origin: envConfig.FRONTEND_SERVICE_URL!,
      credentials: true,
    })
  );

  return app;
};

export const startServer = (app: Hono, port: number): void => {
  serve({
    fetch: app.fetch,
    port,
  });
};
