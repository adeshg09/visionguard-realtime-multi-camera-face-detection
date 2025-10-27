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

	// Calculate frame metrics
	dropRate := float64(0)
	if session.totalFramesReceived > 0 {
		dropRate = float64(session.totalFramesDropped) / float64(session.totalFramesReceived) * 100
	}

	return &models.StreamStatusResponse{
		CameraID:        cameraID,
		Status:          session.Status,
		IsActive:        session.IsActive(),
		UptimeMs:        uptime,
		WebRTCUrl:       fmt.Sprintf("http://%s:%d/%s", sm.config.MediaMTXHost, sm.config.MediaMTXWebRTCPort, mediaPath),
		HLSUrl:          fmt.Sprintf("http://%s:%d/%s/index.m3u8", sm.config.MediaMTXHost, sm.config.MediaMTXHLSPort, mediaPath),
		RTSPUrl:         fmt.Sprintf("rtsp://%s:%d/%s", sm.config.MediaMTXHost, sm.config.MediaMTXRTSPPort, mediaPath),
		RTMPUrl:         fmt.Sprintf("rtmp://%s:%d/%s", sm.config.MediaMTXHost, sm.config.MediaMTXRTMPPort, mediaPath),
		FramesReceived:  session.totalFramesReceived,
		FramesProcessed: session.totalFramesProcessed,
		FramesDropped:   session.totalFramesDropped,
		DropRate:        dropRate,
		TargetFPS:       session.targetFPS,
		DetectedFPS:     session.detectedMaxFPS,
	}, nil
}

// GetHealthStatus returns comprehensive health status with capacity indicators
func (sm *StreamManager) GetHealthStatus() *models.HealthCheckResponse {
	sm.sessionsMutex.RLock()
	activeCount := len(sm.sessions)
	streamStatuses := make(map[string]models.StreamStatus, len(sm.sessions))

	// Collect detailed stream info
	streamDetails := make([]models.StreamDetail, 0, len(sm.sessions))
	for cameraID, session := range sm.sessions {
		streamStatuses[cameraID] = session.Status

		// Calculate drop rate
		dropRate := float64(0)
		if session.totalFramesReceived > 0 {
			dropRate = float64(session.totalFramesDropped) / float64(session.totalFramesReceived) * 100
		}

		streamDetails = append(streamDetails, models.StreamDetail{
			CameraID:        cameraID,
			Status:          string(session.Status),
			UptimeSeconds:   int64(session.GetUptime().Seconds()),
			FramesProcessed: session.totalFramesProcessed,
			FramesDropped:   session.totalFramesDropped,
			DropRate:        dropRate,
			TargetFPS:       session.targetFPS,
		})
	}
	sm.sessionsMutex.RUnlock()

	// Determine health status based on capacity
	healthStatus := "healthy"
	capacityStatus := "optimal"

	if activeCount > sm.OptimalStreamCapacity {
		overCapacity := activeCount - sm.OptimalStreamCapacity

		if overCapacity <= 4 {
			// 5-8 streams: Degraded performance expected
			healthStatus = "degraded"
			capacityStatus = "over_capacity"
		} else {
			// 9+ streams: Critical overload
			healthStatus = "overloaded"
			capacityStatus = "critically_overloaded"
		}
	}

	// Calculate utilization percentage
	utilizationPercent := float64(0)
	if sm.OptimalStreamCapacity > 0 {
		utilizationPercent = float64(activeCount) / float64(sm.OptimalStreamCapacity) * 100
	}

	return &models.HealthCheckResponse{
		Status:                healthStatus,
		Timestamp:             time.Now().Format(time.RFC3339),
		Service:               "VisionGuard Worker Service",
		Version:               "2.0.0",
		ActiveStreams:         activeCount,
		OptimalStreamCapacity: sm.OptimalStreamCapacity,
		CapacityStatus:        capacityStatus,
		UtilizationPercent:    utilizationPercent,
		StreamSessions:        streamStatuses,
		StreamDetails:         streamDetails,
	}
}
