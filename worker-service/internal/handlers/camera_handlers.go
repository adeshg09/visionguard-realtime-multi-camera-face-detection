package handlers

import (
	"errors"
	"worker-service/internal/models"
	"worker-service/internal/services/stream"
	"worker-service/internal/utils"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
)

// CameraHandler handles camera-related endpoints
type CameraHandler struct {
	streamManager *stream.Manager
	logger        *logrus.Logger
}

// NewCameraHandler creates a new camera handler
func NewCameraHandler(sm *stream.Manager) *CameraHandler {
	return &CameraHandler{
		streamManager: sm,
		logger:        utils.GetLogger(),
	}
}

// HealthCheck handles health check requests
func (h *CameraHandler) HealthCheck(c *gin.Context) {
	health := h.streamManager.GetHealthStatus()
	utils.SendOK(c, utils.HealthCheckSuccess, health)
}

// StartStream handles start stream requests
func (h *CameraHandler) StartStream(c *gin.Context) {
	var req models.StartStreamRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Warnf("Invalid start stream request: %v", err)
		utils.SendBadRequest(c, errors.New(utils.InvalidRequestError))
		return
	}

	h.logger.Infof("Start stream request: Camera %s (%s)", req.CameraID, req.Name)

	resp, err := h.streamManager.StartStream(&req)
	if err != nil {
		h.logger.Errorf("Failed to start stream: %v", err)
		utils.SendBadRequest(c, err)
		return
	}

	utils.SendOK(c, utils.StreamStartSuccess, resp)
}

// StopStream handles stop stream requests
func (h *CameraHandler) StopStream(c *gin.Context) {
	var req models.StopStreamRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Warnf("Invalid stop stream request: %v", err)
		utils.SendBadRequest(c, errors.New(utils.InvalidRequestError))
		return
	}

	h.logger.Infof("Stop stream request: Camera %s", req.CameraID)

	resp, err := h.streamManager.StopStream(req.CameraID)
	if err != nil {
		h.logger.Errorf("Failed to stop stream: %v", err)
		utils.SendBadRequest(c, err)
		return
	}

	utils.SendOK(c, utils.StreamStopSuccess, resp)
}

// ToggleFaceDetection handles face detection toggle requests
func (h *CameraHandler) ToggleFaceDetection(c *gin.Context) {
	cameraID := c.Param("id")
	if cameraID == "" {
		utils.SendBadRequest(c, errors.New("camera ID is required"))
		return
	}

	var req models.FaceDetectionToggleRequest
	req.CameraID = cameraID
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Warnf("Invalid face detection toggle request: %v", err)
		utils.SendBadRequest(c, errors.New(utils.InvalidRequestError))
		return
	}

	h.logger.Infof("Toggling face detection for camera %s to %v", cameraID, req.Enabled)

	if err := h.streamManager.ToggleFaceDetection(cameraID, req.Enabled); err != nil {
		h.logger.Errorf("Failed to toggle face detection: %v", err)
		utils.SendNotFound(c, err)
		return
	}

	utils.SendOK(c, utils.FaceDetectionToggled, models.FaceDetectionToggleResponse{
		Success:              true,
		CameraID:             cameraID,
		FaceDetectionEnabled: req.Enabled,
		Message:              utils.FaceDetectionToggled,
	})
}

// UpdateFrameSkipInterval handles frame skip interval update requests
func (h *CameraHandler) UpdateFrameSkipInterval(c *gin.Context) {
	cameraID := c.Param("id")
	if cameraID == "" {
		utils.SendBadRequest(c, errors.New("camera ID is required"))
		return
	}

	var req struct {
		FrameSkipInterval int `json:"frameSkipInterval" binding:"required,min=1,max=10"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Warnf("Invalid frame skip request: %v", err)
		utils.SendBadRequest(c, errors.New(utils.InvalidRequestError))
		return
	}

	h.logger.Infof("Updating frame skip interval for camera %s to %d", cameraID, req.FrameSkipInterval)

	if err := h.streamManager.UpdateFrameSkipInterval(cameraID, req.FrameSkipInterval); err != nil {
		h.logger.Errorf("Failed to update frame skip interval: %v", err)
		utils.SendNotFound(c, err)
		return
	}

	utils.SendOK(c, utils.FrameSkipUpdated, gin.H{
		"success":           true,
		"cameraID":          cameraID,
		"frameSkipInterval": req.FrameSkipInterval,
		"message":           utils.FrameSkipUpdated,
	})
}
