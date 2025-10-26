package handlers

// ----------------------------------------------------------------------

import (
	"encoding/json"
	"fmt"
	"io"
	"worker-service/internal/models"
	"worker-service/internal/services"
	"worker-service/internal/utils"

	"github.com/gin-gonic/gin"
)

// ----------------------------------------------------------------------

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

// ----------------------------------------------------------------------

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

	var requestBody map[string]interface{}

	if err := c.BindJSON(&requestBody); err != nil {
		bodyBytes, _ := io.ReadAll(c.Request.Body)
		logger.Infof("📦 Raw body: %s", string(bodyBytes))

		var manualReq struct {
			Enabled bool `json:"enabled"`
		}
		if err := json.Unmarshal(bodyBytes, &manualReq); err != nil {
			utils.ErrorBadRequest(c, fmt.Errorf("invalid JSON: %v", err))
			return
		}

		if err := h.streamManager.ToggleFaceDetection(cameraID, manualReq.Enabled); err != nil {
			utils.ErrorNotFound(c, err)
			return
		}

		resp := map[string]interface{}{
			"cameraId":             cameraID,
			"faceDetectionEnabled": manualReq.Enabled,
		}

		message := "Face detection enabled"
		if !manualReq.Enabled {
			message = "Face detection disabled"
		}

		utils.SuccessOK(c, message, resp)
		return
	}

	enabled, ok := requestBody["enabled"].(bool)
	if !ok {
		utils.ErrorBadRequest(c, fmt.Errorf("enabled field must be a boolean"))
		return
	}

	if err := h.streamManager.ToggleFaceDetection(cameraID, enabled); err != nil {
		utils.ErrorNotFound(c, err)
		return
	}

	resp := map[string]interface{}{
		"cameraId":             cameraID,
		"faceDetectionEnabled": enabled,
	}

	message := "Face detection enabled"
	if !enabled {
		message = "Face detection disabled"
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
