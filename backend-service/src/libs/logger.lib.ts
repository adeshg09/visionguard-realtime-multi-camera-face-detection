import winston from "winston";

const isProduction = process.env.NODE_ENV === "production";

export const logger = winston.createLogger({
  level: isProduction ? "info" : "debug",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    isProduction ? winston.format.json() : winston.format.simple()
  ),
  defaultMeta: { service: "visionguard-backend" },
  transports: [new winston.transports.Console()],
});

// Add file transports only in production
if (isProduction) {
  logger.add(
    new winston.transports.File({ filename: "logs/error.log", level: "error" })
  );
  logger.add(new winston.transports.File({ filename: "logs/combined.log" }));
}
