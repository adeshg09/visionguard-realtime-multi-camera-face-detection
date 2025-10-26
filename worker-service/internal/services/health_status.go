package services

// ----------------------------------------------------------------------

import (
	"fmt"
	"time"
	"worker-service/internal/models"
)

// ----------------------------------------------------------------------

func (sm *StreamManager) GetAllStreams() map[string]*StreamSession {
	sm.sessionsMutex.RLock()
	defer sm.sessionsMutex.RUnlock()

	result := make(map[string]*StreamSession, len(sm.sessions))
	for k, v := range sm.sessions {
		result[k] = v
	}
	return result
}

func (sm *StreamManager) GetStreamStatus(cameraID string) (*models.StreamStatusResponse, error) {
	session, err := sm.getSession(cameraID)
	if err != nil {
		return nil, err
	}

	uptime := session.GetUptime().Milliseconds()
	mediaPath := fmt.Sprintf("camera_%s", cameraID)

	return &models.StreamStatusResponse{
		CameraID:  cameraID,
		Status:    session.Status,
		IsActive:  session.IsActive(),
		UptimeMs:  uptime,
		WebRTCUrl: fmt.Sprintf("http://%s:%d/%s", sm.config.MediaMTXHost, sm.config.MediaMTXWebRTCPort, mediaPath),
		HLSUrl:    fmt.Sprintf("http://%s:%d/%s/index.m3u8", sm.config.MediaMTXHost, sm.config.MediaMTXHLSPort, mediaPath),
		RTSPUrl:   fmt.Sprintf("rtsp://%s:%d/%s", sm.config.MediaMTXHost, sm.config.MediaMTXRTSPPort, mediaPath),
		RTMPUrl:   fmt.Sprintf("rtmp://%s:%d/%s", sm.config.MediaMTXHost, sm.config.MediaMTXRTMPPort, mediaPath),
	}, nil
}

func (sm *StreamManager) GetHealthStatus() *models.HealthCheckResponse {
	sm.sessionsMutex.RLock()
	activeCount := len(sm.sessions)
	streamStatuses := make(map[string]models.StreamStatus, len(sm.sessions))
	for cameraID, session := range sm.sessions {
		streamStatuses[cameraID] = session.Status
	}
	sm.sessionsMutex.RUnlock()

	return &models.HealthCheckResponse{
		Status:               "healthy",
		Timestamp:            time.Now().Format(time.RFC3339),
		Service:              "VisionGuard Worker Service",
		Version:              "2.0.0",
		ActiveStreams:        activeCount,
		MaxConcurrentStreams: sm.maxConcurrentStreams,
		StreamSessions:       streamStatuses,
	}
}
