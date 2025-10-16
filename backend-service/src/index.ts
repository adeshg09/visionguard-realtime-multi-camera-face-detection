import { serve } from "@hono/node-server";
import { swaggerUI } from "@hono/swagger-ui";
import { createServer as createAppServer } from "@/libs/server.lib.js";
import swaggerDocument from "../swagger.json" with { type: "json" };
import { createRoutes } from "./routes/index.js";
import { envConfig } from "./config/env.config.js";
import {
  createPrismaClient,
  connectDatabase,
  disconnectDatabase,
} from "./libs/database.lib.js";
import { seedDatabase } from "./utils/seed.js";

const main = async () => {
  try {
    // Initialize database
    const prisma = createPrismaClient();

    // Connect to database
    await connectDatabase(prisma);

    // Run seed data
    await seedDatabase(prisma);

    // Create Hono app server
    const app = createAppServer();

    // Setup API routes
    const apiRoutes = createRoutes(prisma);
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

      // Close HTTP server
      server.close();

      // Disconnect database
      await disconnectDatabase(prisma);

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
