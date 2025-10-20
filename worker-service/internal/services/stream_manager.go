package services

import (
	"bufio"
	"fmt"
	"os/exec"
	"strings"
	"sync"
	"time"
	"worker-service/internal/models"
	"worker-service/internal/utils"

	"github.com/google/uuid"
)

// StreamManager manages all active camera streams
type StreamManager struct {
	sessions             map[string]*models.StreamSession
	sessionsMutex        sync.RWMutex
	maxConcurrentStreams int
	mediaClient          *MediaMTXClient
	startTime            time.Time
	totalProcessedFrames int64
	framesMutex          sync.Mutex
}

// NewStreamManager creates a new stream manager
func NewStreamManager(maxConcurrentStreams int, mediaClient *MediaMTXClient) *StreamManager {
	return &StreamManager{
		sessions:             make(map[string]*models.StreamSession),
		maxConcurrentStreams: maxConcurrentStreams,
		mediaClient:          mediaClient,
		startTime:            time.Now(),
		totalProcessedFrames: 0,
	}
}

// StartStream starts a new camera stream
func (sm *StreamManager) StartStream(req *models.StartStreamRequest) (*models.StartStreamResponse, error) {
	logger := utils.GetLogger()

	// Check if already streaming
	sm.sessionsMutex.RLock()
	if _, exists := sm.sessions[req.CameraID]; exists {
		sm.sessionsMutex.RUnlock()
		return nil, fmt.Errorf("stream already active for camera %s", req.CameraID)
	}

	// Check concurrent stream limit
	if len(sm.sessions) >= sm.maxConcurrentStreams {
		sm.sessionsMutex.RUnlock()
		return nil, fmt.Errorf("maximum concurrent streams (%d) reached", sm.maxConcurrentStreams)
	}
	sm.sessionsMutex.RUnlock()

	// Create stream session
	streamID := uuid.New().String()
	mediaPath := fmt.Sprintf("camera_%s", req.CameraID)

	session := &models.StreamSession{
		CameraID:        req.CameraID,
		Camera:          &models.Camera{ID: req.CameraID, Name: req.Name, RTSPUrl: req.RTSPUrl, FPS: req.FPS},
		Status:          models.StreamStatusConnecting,
		StartTime:       time.Now(),
		RTSPInputStream: mediaPath,
		FrameCount:      0,
		ErrorCount:      0,
		Reconnect:       make(chan bool, 1),
		Stop:            make(chan bool, 1),
		Done:            make(chan bool, 1),
	}

	// Register session
	sm.sessionsMutex.Lock()
	sm.sessions[req.CameraID] = session
	sm.sessionsMutex.Unlock()

	logger.Infof("Starting stream for camera %s (ID: %s, RTSP: %s)", req.Name, req.CameraID, req.RTSPUrl)

	// Start stream in a goroutine
	go sm.runStreamSession(session, streamID)

	// Wait for stream to establish
	time.Sleep(2 * time.Second)

	// Verify stream is active
	sm.sessionsMutex.RLock()
	status := sm.sessions[req.CameraID].Status
	sm.sessionsMutex.RUnlock()

	if status == models.StreamStatusError {
		sm.sessionsMutex.Lock()
		delete(sm.sessions, req.CameraID)
		sm.sessionsMutex.Unlock()
		return nil, fmt.Errorf("failed to start stream: connection failed")
	}

	webrtcURL := fmt.Sprintf("http://localhost:8889/%s", mediaPath)
	hlsURL := fmt.Sprintf("http://localhost:8888/%s/index.m3u8", mediaPath)
	rtspURL := fmt.Sprintf("rtsp://localhost:8554/%s", mediaPath)
	rtmpURL := fmt.Sprintf("rtmp://localhost:1935/%s", mediaPath)

	return &models.StartStreamResponse{
		Success:      true,
		CameraID:     req.CameraID,
		StreamID:     streamID,
		MediaMTXPath: mediaPath,
		WebRTCUrl:    webrtcURL,
		HLSUrl:       hlsURL,
		RTSPUrl:      rtspURL,
		RTMPUrl:      rtmpURL,
		Message:      fmt.Sprintf("Stream started successfully for camera %s", req.Name),
	}, nil
}

// StopStream stops an active camera stream
func (sm *StreamManager) StopStream(cameraID string) (*models.StopStreamResponse, error) {
	logger := utils.GetLogger()

	sm.sessionsMutex.RLock()
	session, exists := sm.sessions[cameraID]
	sm.sessionsMutex.RUnlock()

	if !exists {
		return nil, fmt.Errorf("stream not found for camera %s", cameraID)
	}

	logger.Infof("Stopping stream for camera %s", cameraID)

	// Send stop signal
	select {
	case session.Stop <- true:
	default:
	}

	// Wait for session to finish
	timeout := time.After(5 * time.Second)
	select {
	case <-session.Done:
	case <-timeout:
		logger.Warnf("Stream stop timeout for camera %s", cameraID)
	}

	// Remove session
	sm.sessionsMutex.Lock()
	delete(sm.sessions, cameraID)
	sm.sessionsMutex.Unlock()

	logger.Infof("Stream stopped for camera %s", cameraID)

	return &models.StopStreamResponse{
		Success:  true,
		CameraID: cameraID,
		Message:  fmt.Sprintf("Stream stopped successfully for camera %s", cameraID),
	}, nil
}

// GetStreamStatus returns the status of a stream
func (sm *StreamManager) GetStreamStatus(cameraID string) (*models.StreamStatusResponse, error) {
	sm.sessionsMutex.RLock()
	session, exists := sm.sessions[cameraID]
	sm.sessionsMutex.RUnlock()

	if !exists {
		return nil, fmt.Errorf("stream not found for camera %s", cameraID)
	}

	uptime := time.Since(session.StartTime).Milliseconds()

	mediaPath := session.RTSPInputStream
	webrtcURL := fmt.Sprintf("http://localhost:8889/%s", mediaPath)
	hlsURL := fmt.Sprintf("http://localhost:8888/%s/index.m3u8", mediaPath)
	rtspURL := fmt.Sprintf("rtsp://localhost:8554/%s", mediaPath)
	rtmpURL := fmt.Sprintf("rtmp://localhost:1935/%s", mediaPath)

	resp := &models.StreamStatusResponse{
		CameraID:   cameraID,
		Status:     session.Status,
		IsActive:   session.Status == models.StreamStatusStreaming,
		UptimeMs:   uptime,
		FrameCount: session.FrameCount,
		ErrorCount: session.ErrorCount,
		WebRTCUrl:  webrtcURL,
		HLSUrl:     hlsURL,
		RTSPUrl:    rtspURL,
		RTMPUrl:    rtmpURL,
	}
	if session.LastError != nil {
		resp.LastError = session.LastError.Error()
	}

	return resp, nil
}

// GetAllStreams returns all active streams
func (sm *StreamManager) GetAllStreams() map[string]*models.StreamSession {
	sm.sessionsMutex.RLock()
	defer sm.sessionsMutex.RUnlock()

	result := make(map[string]*models.StreamSession)
	for k, v := range sm.sessions {
		result[k] = v
	}
	return result
}

// GetHealthStatus returns health check information
func (sm *StreamManager) GetHealthStatus() *models.HealthCheckResponse {
	sm.sessionsMutex.RLock()
	activeCount := len(sm.sessions)
	streamStatuses := make(map[string]models.StreamStatus)
	for cameraID, session := range sm.sessions {
		streamStatuses[cameraID] = session.Status
	}
	sm.sessionsMutex.RUnlock()

	uptime := time.Since(sm.startTime).Seconds()

	sm.framesMutex.Lock()
	totalFrames := sm.totalProcessedFrames
	sm.framesMutex.Unlock()

	return &models.HealthCheckResponse{
		Status:               "healthy",
		Timestamp:            time.Now().Format("2006-01-02T15:04:05Z07:00"),
		Service:              "VisionGuard Worker Service",
		Version:              "1.0.0",
		ActiveStreams:        activeCount,
		MaxConcurrentStreams: sm.maxConcurrentStreams,
		TotalProcessedFrames: totalFrames,
		UptimeSeconds:        int64(uptime),
		StreamSessions:       streamStatuses,
	}
}

// runStreamSession manages the lifecycle of a stream
func (sm *StreamManager) runStreamSession(session *models.StreamSession, streamID string) {
	logger := utils.GetLogger()
	defer func() {
		session.Done <- true
	}()

	reconnectAttempts := 0
	maxReconnectAttempts := 5

	for {
		select {
		case <-session.Stop:
			logger.Infof("[Stream %s] Stop signal received", streamID)
			session.Status = models.StreamStatusStopped
			return

		default:
			if session.Status != models.StreamStatusStreaming {
				// Try to connect
				logger.Infof("[Stream %s] Connecting to RTSP: %s", streamID, session.Camera.RTSPUrl)
				session.Status = models.StreamStatusConnecting

				if err := sm.connectStream(session, streamID); err != nil {
					session.Status = models.StreamStatusError
					session.LastError = err
					session.ErrorCount++
					reconnectAttempts++

					logger.Errorf("[Stream %s] Connection failed (attempt %d/%d): %v", streamID, reconnectAttempts, maxReconnectAttempts, err)

					// In runStreamSession(), change reconnection to be less aggressive initially
					if reconnectAttempts >= maxReconnectAttempts {
						logger.Errorf("[Stream %s] Max reconnect attempts reached", streamID)
						return
					}

					// Start with shorter backoff
					backoffDuration := time.Duration(min(reconnectAttempts, 5)) * time.Second
					logger.Infof("[Stream %s] Retrying in %v", streamID, backoffDuration)
					time.Sleep(backoffDuration)

					logger.Infof("[Stream %s] Retrying in %v", streamID, backoffDuration)
					time.Sleep(backoffDuration)
					continue
				}

				reconnectAttempts = 0
				session.Status = models.StreamStatusStreaming
				logger.Infof("[Stream %s] Connected successfully", streamID)
			}

			// Keep stream alive
			time.Sleep(100 * time.Millisecond)
		}
	}
}

// connectStream establishes a connection and streams from RTSP to MediaMTX
func (sm *StreamManager) connectStream(session *models.StreamSession, streamID string) error {
	logger := utils.GetLogger()

	// First, ensure the path exists in MediaMTX
	if err := sm.mediaClient.CreatePath(session.RTSPInputStream); err != nil {
		return fmt.Errorf("failed to create MediaMTX path: %w", err)
	}

	// Build FFmpeg command to read RTSP and pipe to MediaMTX RTSP
	// Format: ffmpeg -rtsp_transport tcp -i <input_rtsp> -c copy -f rtsp -rtsp_transport tcp -rtsp_flags listen rtsp://mediamtx:8554/<input_path>
	cmd := exec.Command(
		"ffmpeg",
		"-rtsp_transport", "tcp",
		"-i", session.Camera.RTSPUrl,
		"-c", "copy",
		"-f", "rtsp",
		"-rtsp_transport", "tcp",
		"-rtsp_flags", "listen",
		fmt.Sprintf("rtsp://mediamtx:8554/%s", session.RTSPInputStream),
	)

	// Capture stderr for debugging
	stderrPipe, err := cmd.StderrPipe()
	if err != nil {
		return fmt.Errorf("failed to create stderr pipe: %w", err)
	}

	// Start FFmpeg
	if err := cmd.Start(); err != nil {
		return fmt.Errorf("failed to start FFmpeg process: %w", err)
	}

	// Log FFmpeg output in background
	go func() {
		scanner := bufio.NewScanner(stderrPipe)
		for scanner.Scan() {
			line := scanner.Text()
			// Only log errors and warnings, not info messages
			if strings.Contains(line, "error") || strings.Contains(line, "Error") ||
				strings.Contains(line, "failed") || strings.Contains(line, "Failed") {
				logger.Warnf("[Stream %s] FFmpeg: %s", streamID, line)
			}
		}
	}()

	// Monitor FFmpeg process
	go func() {
		if err := cmd.Wait(); err != nil {
			logger.Errorf("[Stream %s] FFmpeg process exited: %v", streamID, err)
			session.LastError = err
			session.Status = models.StreamStatusError

			// Trigger reconnection
			select {
			case session.Reconnect <- true:
			default:
			}
		}
	}()

	// Wait to verify stream starts
	time.Sleep(2 * time.Second)

	// Check if process is still running
	if cmd.ProcessState != nil && cmd.ProcessState.Exited() {
		return fmt.Errorf("ffmpeg exited immediately after start")
	}

	logger.Infof("[Stream %s] FFmpeg process running successfully", streamID)
	return nil
}

// GetTotalProcessedFrames returns total frames processed
func (sm *StreamManager) GetTotalProcessedFrames() int64 {
	sm.framesMutex.Lock()
	defer sm.framesMutex.Unlock()
	return sm.totalProcessedFrames
}

// IncrementFrameCount increments the frame counter
func (sm *StreamManager) IncrementFrameCount(amount int64) {
	sm.framesMutex.Lock()
	sm.totalProcessedFrames += amount
	sm.framesMutex.Unlock()
}
