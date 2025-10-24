import { UserRole, type PrismaClient } from "@prisma/client";
import { hashPassword } from "./password.js";
import { logger } from "@/libs/logger.lib.js";

export const seedDatabase = async (prisma: PrismaClient) => {
  try {
    // Create default admin user
    const adminPassword = await hashPassword(
      process.env.DEFAULT_ADMIN_PASSWORD as string
    );

    const adminUser = await prisma.user.upsert({
      where: { username: "admin" },
      update: {},
      create: {
        username: "admin",
        password: adminPassword,
        email: process.env.DEFAULT_ADMIN_EMAIL as string,
        role: UserRole.admin,
      },
    });
    logger.info("Database seeded successfully");
    logger.info("Admin user created:", adminUser);
  } catch (error) {
    logger.error("Error seeding database:", error);
    throw error;
  }
};
