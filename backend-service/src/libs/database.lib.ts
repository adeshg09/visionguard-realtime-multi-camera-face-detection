/* Relative Imports */
import { PrismaClient } from "@prisma/client";

/* Local Imports */
import { logger } from "./logger.lib.js";

// ----------------------------------------------------------------------

/**
 * Creates a Prisma client instance.
 *
 * @returns {PrismaClient} - The Prisma client instance.
 */
export const createPrismaClient = (): PrismaClient => {
  const prisma = new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "info", "warn", "error"]
        : ["error"],
  });

  return prisma;
};

// ----------------------------------------------------------------------

/**
 * Connect to the database.
 *
 * @param {PrismaClient} prisma - Prisma client instance
 */
export const connectDatabase = async (prisma: PrismaClient): Promise<void> => {
  try {
    await prisma.$connect();
    logger.info("Database connected successfully");
  } catch (error) {
    logger.error("Database connection failed:", error);
  }
};

/**
 * Disconnect from the database.
 *
 * @param {PrismaClient} prisma - Prisma client instance
 */
export const disconnectDatabase = async (
  prisma: PrismaClient
): Promise<void> => {
  try {
    await prisma.$disconnect();
    logger.info("Database disconnected successfully");
  } catch (error) {
    logger.error("Database disconnection failed:", error);
  }
};
