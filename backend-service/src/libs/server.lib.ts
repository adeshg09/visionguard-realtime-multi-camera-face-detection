/* Imports */
import { Hono } from "hono";
import { serve } from "@hono/node-server";

/* Relative Imports */
import { cors } from "hono/cors";

/* Local Imports */
import { envConfig } from "@/config/env.config.js";

// ----------------------------------------------------------------------

/**
 * Create a new Hono app instance.
 * @returns {Hono} - The Hono app instance.
 */
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

// ----------------------------------------------------------------------

/**
 * Start the Hono app server.
 * @param {Hono} app - The Hono app instance.
 * @param {number} port - The port number to listen on.
 */
export const startServer = (app: Hono, port: number): void => {
  serve({
    fetch: app.fetch,
    port,
  });
};
