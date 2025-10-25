package handlers

import (
	"fmt"
	"worker-service/internal/models"
	"worker-service/internal/services"
	"worker-service/internal/utils"

	"github.com/gin-gonic/gin"
)

// CameraHandler handles camera-related endpoints
type CameraHandler struct {
	streamManager *services.StreamManager
}

// NewCameraHandler creates a new camera handler
func NewCameraHandler(sm *services.StreamManager) *CameraHandler {
	return &CameraHandler{
		streamManager: sm,
	}
}

// HealthCheck returns the health status of the service
func (h *CameraHandler) HealthCheck(c *gin.Context) {
	health := h.streamManager.GetHealthStatus()
	utils.SuccessOK(c, "Health check successful", health)
}

// StartStream starts a camera stream
func (h *CameraHandler) StartStream(c *gin.Context) {
	logger := utils.GetLogger()

	var req models.StartStreamRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		logger.Warnf("Invalid start stream request: %v", err)
		utils.ErrorBadRequest(c, fmt.Errorf("invalid request payload: %v", err))
		return
	}

	logger.Infof("Start stream request: Camera %s (%s)", req.Name, req.CameraID)

	resp, err := h.streamManager.StartStream(&req)

	if err != nil {
		logger.Errorf("Failed to start stream for camera %s: %v", req.CameraID, err)
		utils.ErrorBadRequest(c, err)
		return
	}

	logger.Infof("Stream started successfully for camera %s", req.CameraID)
	utils.SuccessOK(c, fmt.Sprintf("Stream started successfully for camera %s", req.Name), resp)
}

// StopStream stops a camera stream
func (h *CameraHandler) StopStream(c *gin.Context) {
	logger := utils.GetLogger()

	var req models.StopStreamRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		logger.Warnf("Invalid stop stream request: %v", err)
		utils.ErrorBadRequest(c, fmt.Errorf("invalid request payload: %v", err))
		return
	}

	logger.Infof("Stop stream request: Camera %s", req.CameraID)

	resp, err := h.streamManager.StopStream(req.CameraID)
	if err != nil {
		logger.Errorf("Failed to stop stream for camera %s: %v", req.CameraID, err)
		utils.ErrorNotFound(c, err)
		return
	}

	logger.Infof("Stream stopped successfully for camera %s", req.CameraID)
	utils.SuccessOK(c, fmt.Sprintf("Stream stopped successfully for camera %s", req.CameraID), resp)
}

// GetStreamStatus returns the status of a camera stream
func (h *CameraHandler) GetStreamStatus(c *gin.Context) {
	logger := utils.GetLogger()

	cameraID := c.Param("id")
	if cameraID == "" {
		logger.Warnf("Missing camera ID in status request")
		utils.ErrorBadRequest(c, fmt.Errorf("camera ID is required"))
		return
	}

	resp, err := h.streamManager.GetStreamStatus(cameraID)
	if err != nil {
		logger.Warnf("Stream status error for camera %s: %v", cameraID, err)
		utils.ErrorNotFound(c, err)
		return
	}

	utils.SuccessOK(c, "Stream status retrieved successfully", resp)
}

// ToggleFaceDetection toggles face detection for a camera stream
func (h *CameraHandler) ToggleFaceDetection(c *gin.Context) {
	logger := utils.GetLogger()

	cameraID := c.Param("id")
	if cameraID == "" {
		utils.ErrorBadRequest(c, fmt.Errorf("camera ID is required"))
		return
	}

	var req models.ToggleFaceDetectionRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		logger.Warnf("Invalid face detection toggle request: %v", err)
		utils.ErrorBadRequest(c, fmt.Errorf("invalid request payload: enabled field is required"))
		return
	}

	logger.Infof("Toggling face detection for camera %s to %v", cameraID, req.Enabled)

	if err := h.streamManager.ToggleFaceDetection(cameraID, req.Enabled); err != nil {
		logger.Errorf("Failed to toggle face detection for camera %s: %v", cameraID, err)
		utils.ErrorNotFound(c, err)
		return
	}

	resp := map[string]interface{}{
		"cameraId":             cameraID,
		"faceDetectionEnabled": req.Enabled,
	}

	message := "Face detection enabled successfully"
	if !req.Enabled {
		message = "Face detection disabled successfully"
	}

	utils.SuccessOK(c, message, resp)
}

// UpdateFPS updates the target FPS for a camera stream
func (h *CameraHandler) UpdateFPS(c *gin.Context) {
	logger := utils.GetLogger()

	cameraID := c.Param("id")
	if cameraID == "" {
		utils.ErrorBadRequest(c, fmt.Errorf("camera ID is required"))
		return
	}

	var req models.UpdateFPSRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		logger.Warnf("Invalid FPS update request: %v", err)
		utils.ErrorBadRequest(c, fmt.Errorf("FPS must be between 1 and 60"))
		return
	}

	logger.Infof("Updating FPS for camera %s to %d", cameraID, req.TargetFPS)

	if err := h.streamManager.UpdateFPS(cameraID, req.TargetFPS); err != nil {
		logger.Errorf("Failed to update FPS for camera %s: %v", cameraID, err)
		utils.ErrorNotFound(c, err)
		return
	}

	resp := map[string]interface{}{
		"cameraId":  cameraID,
		"targetFPS": req.TargetFPS,
	}

	utils.SuccessOK(c, "FPS updated successfully", resp)
}
