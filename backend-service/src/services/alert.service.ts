import { Prisma, PrismaClient } from "@prisma/client";
import {
  AlertResponse,
  AlertsQueryParams,
  CreateAlertRequest,
} from "@/dtos/alert.dto.js";
import { logger } from "@/libs/logger.lib.js";
import { PaginatedResponse } from "@/types/index.js";
import { RESPONSE_ERROR_MESSAGES } from "@/constants/index.js";

export const createAlertService = (prisma: PrismaClient) => {
  const createAlert = async (
    alertData: CreateAlertRequest
  ): Promise<AlertResponse> => {
    const camera = await prisma.camera.findUnique({
      where: { id: alertData.cameraId },
    });

    if (!camera) {
      throw new Error(RESPONSE_ERROR_MESSAGES.CAMERA_NOT_FOUND);
    }

    const alert = await prisma.alert.create({
      data: {
        cameraId: alertData.cameraId,
        faceCount: alertData.faceCount,
        confidence: alertData.confidence,
        snapshotUrl: alertData.snapshotUrl || null,
        metadata: (alertData.metadata as Prisma.JsonObject) || null,
      },
      include: {
        camera: {
          select: {
            id: true,
            name: true,
            location: true,
          },
        },
      },
    });

    logger.info(`Alert created: ${alert.id} for camera ${alertData.cameraId}`);

    return {
      id: alert.id,
      cameraId: alert.cameraId,
      faceCount: alert.faceCount,
      confidence: alert.confidence,
      snapshotUrl: alert.snapshotUrl,
      metadata: alert.metadata as Record<string, any> | null,
      createdAt: alert.createdAt,
      camera: alert.camera,
    };
  };

  const getAlerts = async (
    userId: string,
    queryParams: AlertsQueryParams
  ): Promise<PaginatedResponse<AlertResponse>> => {
    const {
      cameraId,
      startDate,
      endDate,
      minConfidence,
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = queryParams;

    // Build where clause
    const where: any = {
      camera: {
        userId,
      },
    };

    if (cameraId) {
      where.cameraId = cameraId;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    if (minConfidence !== undefined) {
      where.confidence = { gte: minConfidence };
    }

    const [alerts, totalRecords] = await Promise.all([
      prisma.alert.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          camera: {
            select: {
              id: true,
              name: true,
              location: true,
            },
          },
        },
      }),
      prisma.alert.count({ where }),
    ]);

    return {
      data: alerts.map((alert) => ({
        id: alert.id,
        cameraId: alert.cameraId,
        faceCount: alert.faceCount,
        confidence: alert.confidence,
        snapshotUrl: alert.snapshotUrl,
        metadata: alert.metadata as Record<string, any> | null,
        createdAt: alert.createdAt,
        camera: alert.camera,
      })),
      pagination: {
        page,
        limit,
        totalRecords,
        totalPages: Math.ceil(totalRecords / limit),
      },
    };
  };

  const getAlertById = async (
    alertId: string,
    userId: string
  ): Promise<AlertResponse | null> => {
    const alert = await prisma.alert.findFirst({
      where: {
        id: alertId,
        camera: {
          userId,
        },
      },
      include: {
        camera: {
          select: {
            id: true,
            name: true,
            location: true,
          },
        },
      },
    });

    if (!alert) {
      throw new Error(RESPONSE_ERROR_MESSAGES.ALERT_NOT_FOUND);
    }

    return {
      id: alert.id,
      cameraId: alert.cameraId,
      faceCount: alert.faceCount,
      confidence: alert.confidence,
      snapshotUrl: alert.snapshotUrl,
      metadata: alert.metadata as Record<string, any> | null,
      createdAt: alert.createdAt,
      camera: alert.camera,
    };
  };

  const getRecentAlertsByCamera = async (
    cameraId: string,
    userId: string,
    limit: number = 10
  ): Promise<AlertResponse[]> => {
    const alerts = await prisma.alert.findMany({
      where: {
        cameraId,
        camera: {
          userId,
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        camera: {
          select: {
            id: true,
            name: true,
            location: true,
          },
        },
      },
    });

    return alerts.map((alert) => ({
      id: alert.id,
      cameraId: alert.cameraId,
      faceCount: alert.faceCount,
      confidence: alert.confidence,
      snapshotUrl: alert.snapshotUrl,
      metadata: alert.metadata as Record<string, any> | null,
      createdAt: alert.createdAt,
      camera: alert.camera,
    }));
  };

  const getCameraAlertStats = async (
    cameraId: string,
    userId: string
  ): Promise<{
    totalAlerts: number;
    todayAlerts: number;
    averageConfidence: number;
  }> => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const where: any = {
      cameraId,
      camera: {
        userId,
      },
    };

    const [totalAlerts, todayAlerts, avgResult] = await Promise.all([
      prisma.alert.count({ where }),
      prisma.alert.count({
        where: {
          ...where,
          createdAt: { gte: startOfDay },
        },
      }),
      prisma.alert.aggregate({
        where,
        _avg: {
          confidence: true,
        },
      }),
    ]);

    return {
      totalAlerts,
      todayAlerts,
      averageConfidence: avgResult._avg.confidence || 0,
    };
  };

  return {
    createAlert,
    getAlerts,
    getAlertById,
    getRecentAlertsByCamera,
    getCameraAlertStats,
  };
};
