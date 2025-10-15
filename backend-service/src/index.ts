import {
  createServer as createAppServer,
  startServer,
} from "./libs/server.lib";
import { createRoutes } from "./routes";
import { swaggerUI } from "@hono/swagger-ui";
import swaggerDocument from "../swagger.json";
import { serve } from "@hono/node-server";
import { envConfig } from "./config/env.config";

const main = async () => {
  try {
    // Create Hono app server
    const app = createAppServer();

    // Setup API routes
    const apiRoutes = createRoutes();
    app.route("/api/v1", apiRoutes);

    app.get("/api-docs/openapi.json", (c) => c.json(swaggerDocument));
    app.get("/api-docs", swaggerUI({ url: "/api-docs/openapi.json" }));

    // Start server
    const server = serve(
      {
        fetch: app.fetch,
        port: envConfig.BACKEND_SERVICE_PORT!,
      },
      (info) => {
        console.log(`🚀 Server running on port ${info.port}`);
      }
    );

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      console.log(`${signal} received, shutting down gracefully`);

      server.close();

      process.exit(0);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (error) {
    console.log("Failed to start server:", error);
    process.exit(1);
  }
};

main();
