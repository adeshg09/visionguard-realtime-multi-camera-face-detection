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
			"frameCount": session.FrameCount,
			"errorCount": session.ErrorCount,
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

// GetStreamStats handles GET /api/v1/camera/:id/stats
func (h *CameraHandler) GetStreamStats(c *gin.Context) {
	logger := utils.GetLogger()

	cameraID := c.Param("id")
	if cameraID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "camera ID is required",
		})
		return
	}

	stats, err := h.streamManager.GetStreamStats(cameraID)
	if err != nil {
		logger.Warnf("Stream stats error: %v", err)
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"stats":   stats,
	})
}

// // ToggleFaceDetection handles POST /api/v1/camera/:id/face-detection
func (h *CameraHandler) ToggleFaceDetection(c *gin.Context) {
	logger := utils.GetLogger()

	cameraID := c.Param("id")
	if cameraID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "camera ID is required",
		})
		return
	}

	var req models.FaceDetectionToggleRequest
	req.CameraID = cameraID
	if err := c.ShouldBindJSON(&req); err != nil {
		logger.Warnf("Invalid face detection toggle request: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	logger.Infof("Toggling face detection for camera %s to %v", cameraID, req.Enabled)

	if err := h.streamManager.ToggleFaceDetection(cameraID, req.Enabled); err != nil {
		logger.Errorf("Failed to toggle face detection: %v", err)
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, models.FaceDetectionToggleResponse{
		Success:              true,
		CameraID:             cameraID,
		FaceDetectionEnabled: req.Enabled,
		Message:              "Face detection toggled successfully",
	})
}

// // UpdateFrameSkipInterval handles POST /api/v1/camera/:id/frame-skip
func (h *CameraHandler) UpdateFrameSkipInterval(c *gin.Context) {
	logger := utils.GetLogger()

	cameraID := c.Param("id")
	if cameraID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "camera ID is required",
		})
		return
	}

	var req struct {
		FrameSkipInterval int `json:"frameSkipInterval" binding:"min=1,max=10"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		logger.Warnf("Invalid frame skip request: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	logger.Infof("Updating frame skip interval for camera %s to %d", cameraID, req.FrameSkipInterval)

	if err := h.streamManager.UpdateFrameSkipInterval(cameraID, req.FrameSkipInterval); err != nil {
		logger.Errorf("Failed to update frame skip interval: %v", err)
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":           true,
		"cameraID":          cameraID,
		"frameSkipInterval": req.FrameSkipInterval,
		"message":           "Frame skip interval updated successfully",
	})
}

// // GetCameraMetrics handles GET /api/v1/camera/:id/metrics
func (h *CameraHandler) GetCameraMetrics(c *gin.Context) {
	logger := utils.GetLogger()

	cameraID := c.Param("id")
	if cameraID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "camera ID is required",
		})
		return
	}

	stats, err := h.streamManager.GetStreamStats(cameraID)
	if err != nil {
		logger.Warnf("Failed to get metrics: %v", err)
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"metrics": stats,
	})
}

// // GetAllMetrics handles GET /api/v1/metrics
func (h *CameraHandler) GetAllMetrics(c *gin.Context) {
	allStreams := h.streamManager.GetAllStreams()

	metrics := make(map[string]interface{})
	for cameraID := range allStreams {
		stats, err := h.streamManager.GetStreamStats(cameraID)
		if err == nil {
			metrics[cameraID] = stats
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"metrics": metrics,
		"count":   len(metrics),
	})
}

// // GetPerformanceStats handles GET /api/v1/performance
func (h *CameraHandler) GetPerformanceStats(c *gin.Context) {
	allStreams := h.streamManager.GetAllStreams()

	performance := make(map[string]interface{})
	for cameraID, session := range allStreams {
		if session.PerfOptimizer != nil {
			performance[cameraID] = session.PerfOptimizer.GetMetrics()
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success":     true,
		"performance": performance,
		"activeCount": len(allStreams),
	})
}
