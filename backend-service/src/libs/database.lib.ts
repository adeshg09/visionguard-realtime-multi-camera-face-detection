import { PrismaClient } from "@prisma/client";
import { logger } from "./logger.lib.js";

export const createPrismaClient = (): PrismaClient => {
  const prisma = new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "info", "warn", "error"]
        : ["error"],
  });

  return prisma;
};

export const connectDatabase = async (prisma: PrismaClient): Promise<void> => {
  try {
    await prisma.$connect();
    logger.info("Database connected successfully");
  } catch (error) {
    logger.error("Database connection failed:", error);
  }
};

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
