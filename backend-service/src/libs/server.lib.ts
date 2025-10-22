import { envConfig } from "@/config/env.config.js";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";

export const createServer = (): Hono => {
  const app = new Hono();

  // Global middlewares
  app.use(
    cors({
      origin: "http://localhost:5173",
      allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
      allowHeaders: ["Content-Type", "Authorization"],
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
