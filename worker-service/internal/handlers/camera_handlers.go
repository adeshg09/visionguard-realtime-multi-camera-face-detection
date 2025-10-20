package handlers

import (
	"net/http"
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

// StartStream handles POST /api/v1/camera/start
func (h *CameraHandler) StartStream(c *gin.Context) {
	logger := utils.GetLogger()

	var req models.StartStreamRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		logger.Warnf("Invalid start stream request: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	logger.Infof("Start stream request: Camera %s (%s)", req.CameraID, req.Name)

	resp, err := h.streamManager.StartStream(&req)
	if err != nil {
		logger.Errorf("Failed to start stream: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, resp)
}

// StopStream handles POST /api/v1/camera/stop
func (h *CameraHandler) StopStream(c *gin.Context) {
	logger := utils.GetLogger()

	var req models.StopStreamRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		logger.Warnf("Invalid stop stream request: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	logger.Infof("Stop stream request: Camera %s", req.CameraID)

	resp, err := h.streamManager.StopStream(req.CameraID)
	if err != nil {
		logger.Errorf("Failed to stop stream: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, resp)
}

// GetStreamStatus handles GET /api/v1/camera/:id/status
func (h *CameraHandler) GetStreamStatus(c *gin.Context) {
	logger := utils.GetLogger()

	cameraID := c.Param("id")
	if cameraID == "" {
		logger.Warnf("Missing camera ID in status request")
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "camera ID is required",
		})
		return
	}

	resp, err := h.streamManager.GetStreamStatus(cameraID)
	if err != nil {
		logger.Warnf("Stream status error: %v", err)
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, resp)
}

// GetAllStreams handles GET /api/v1/camera/streams/all
func (h *CameraHandler) GetAllStreams(c *gin.Context) {
	streams := h.streamManager.GetAllStreams()

	result := make(map[string]interface{})
	for cameraID, session := range streams {
		result[cameraID] = gin.H{
			"status":     session.Status,
			"frameCout":  session.FrameCount,
			"errorCount": session.ErrorCount,
			"uptime":     session.LastFrameTime,
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"streams": result,
		"count":   len(streams),
	})
}

// HealthCheck handles GET /api/v1/health
func (h *CameraHandler) HealthCheck(c *gin.Context) {
	health := h.streamManager.GetHealthStatus()
	c.JSON(http.StatusOK, health)
}
