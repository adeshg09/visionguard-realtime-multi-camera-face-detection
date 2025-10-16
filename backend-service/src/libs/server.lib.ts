import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";

export const createServer = (): Hono => {
  const app = new Hono();

  // Global middlewares
  app.use(
    cors({
      origin: "*",
      allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
      allowHeaders: ["Content-Type", "Authorization"],
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
