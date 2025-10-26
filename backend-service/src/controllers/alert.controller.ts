/* Imports */
import type { Context } from "hono";

/* Relative Imports */
import { PrismaClient } from "@prisma/client";

/* Local Imports */
import { successResponse, errorResponse } from "@/utils/response.js";
import {
  RESPONSE_ERROR_MESSAGES,
  RESPONSE_MESSAGES,
  RESPONSE_SUCCESS_MESSAGES,
  STATUS_CODES,
} from "@/constants/index.js";
import { AlertsQueryParams, CreateAlertRequest } from "@/dtos/alert.dto.js";
import { createAlertService } from "@/services/alert.service.js";
import { AlertNotification } from "@/types/websocket.js";
import { websocketService } from "@/libs/websocket.lib.js";

// ----------------------------------------------------------------------

/**
 * Controller to handle all alert-related operations.
 *
 * @param {PrismaClient} prisma - Prisma client instance
 * @returns {object} - Alert controller with all handlers
 */
export const createAlertController = (prisma: PrismaClient) => {
  /* Services */
  const alertService = createAlertService(prisma);

  // ----------------------------------------------------------------------

  /**
   * Create a new alert.
   *
   * @route POST /api/alerts/create-alert
   */
  const createAlert = async (c: Context) => {
    try {
      const alertData = c.get("validatedData") as CreateAlertRequest;

      const alert = await alertService.createAlert(alertData);

      // Broadcast alert via WebSocket
      const notification: AlertNotification = {
        type: "ALERT_CREATED",
        data: {
          id: alert.id,
          cameraId: alert.cameraId,
          cameraName: alert.camera?.name || "Unknown",
          location: alert.camera?.location || "Unknown",
          faceCount: alert.faceCount,
          confidence: alert.confidence,
          snapshotUrl: alert.snapshotUrl,
          timestamp: alert.createdAt.toISOString(),
        },
      };

      websocketService.broadcastAlert(notification);

      return successResponse(
        c,
        STATUS_CODES.CREATED,
        RESPONSE_MESSAGES.SUCCESS,
        RESPONSE_SUCCESS_MESSAGES.ALERT_CREATED,
        alert
      );
    } catch (error) {
      return errorResponse(
        c,
        STATUS_CODES.BAD_REQUEST,
        RESPONSE_ERROR_MESSAGES.ALERT_CREATE_FAILED,
        error
      );
    }
  };

  /**
   * Retrieve the list of alerts.
   *
   * @route GET /api/alerts/get-alerts
   */
  const getAlerts = async (c: Context) => {
    try {
      const user = c.get("user");
      const queryParams = c.get("validatedQuery") as AlertsQueryParams;

      const result = await alertService.getAlerts(user.id, queryParams);

      return successResponse(
        c,
        STATUS_CODES.OK,
        RESPONSE_MESSAGES.SUCCESS,
        RESPONSE_SUCCESS_MESSAGES.ALERTS_RETRIEVED,
        {
          alerts: result.data,
          pagination: result.pagination,
        }
      );
    } catch (error) {
      return errorResponse(
        c,
        STATUS_CODES.BAD_REQUEST,
        RESPONSE_ERROR_MESSAGES.ALERTS_RETRIEVE_FAILED,
        error
      );
    }
  };

  /**
   * Retrieve an alert by its ID.
   *
   * @route GET /api/alerts/get-alert-by-id/:id
   */
  const getAlertById = async (c: Context) => {
    try {
      const user = c.get("user");
      const alertId = c.req.param("id");

      const alert = await alertService.getAlertById(alertId, user.id);

      return successResponse(
        c,
        STATUS_CODES.OK,
        RESPONSE_MESSAGES.SUCCESS,
        RESPONSE_SUCCESS_MESSAGES.ALERT_RETRIEVED,
        alert
      );
    } catch (error) {
      return errorResponse(
        c,
        STATUS_CODES.BAD_REQUEST,
        RESPONSE_ERROR_MESSAGES.ALERT_RETRIEVE_FAILED,
        error
      );
    }
  };

  /**
   * Retrieve recent alerts for a specific camera.
   *
   * @route GET /api/alerts/get-recent-alerts-by-camera/:cameraId
   */
  const getRecentAlertsByCamera = async (c: Context) => {
    try {
      const user = c.get("user");
      const cameraId = c.req.param("cameraId");
      const limit = parseInt(c.req.query("limit") || "10");

      const alerts = await alertService.getRecentAlertsByCamera(
        cameraId,
        user.id,
        limit
      );

      return successResponse(
        c,
        STATUS_CODES.OK,
        RESPONSE_MESSAGES.SUCCESS,
        RESPONSE_SUCCESS_MESSAGES.ALERTS_RETRIEVED,
        alerts
      );
    } catch (error) {
      return errorResponse(
        c,
        STATUS_CODES.BAD_REQUEST,
        RESPONSE_ERROR_MESSAGES.ALERTS_RETRIEVE_FAILED,
        error
      );
    }
  };

  /**
   * Retrieve alert statistics for a specific camera.
   *
   * @route GET /api/alerts/get-camera-alert-stats/:cameraId
   */
  const getCameraAlertStats = async (c: Context) => {
    try {
      const user = c.get("user");
      const cameraId = c.req.param("cameraId");

      const stats = await alertService.getCameraAlertStats(cameraId, user.id);

      return successResponse(
        c,
        STATUS_CODES.OK,
        RESPONSE_MESSAGES.SUCCESS,
        RESPONSE_SUCCESS_MESSAGES.ALERT_STATS_RETRIEVED,
        stats
      );
    } catch (error) {
      return errorResponse(
        c,
        STATUS_CODES.BAD_REQUEST,
        RESPONSE_ERROR_MESSAGES.ALERT_STATS_RETRIEVE_FAILED,
        error
      );
    }
  };

  // ----------------------------------------------------------------------

  /* Return all controller functions */
  return {
    createAlert,
    getAlerts,
    getAlertById,
    getRecentAlertsByCamera,
    getCameraAlertStats,
  };
};
