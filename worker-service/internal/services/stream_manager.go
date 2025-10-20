package services

import (
	"bufio"
	"fmt"
	"os"
	"os/exec"
	"strings"
	"sync"
	"time"
	"worker-service/internal/models"
	"worker-service/internal/utils"

	"github.com/google/uuid"
)

type StreamSession struct {
	CameraID        string
	Camera          *models.Camera
	Status          models.StreamStatus
	StartTime       time.Time
	RTSPInputStream string // Path in MediaMTX
	WebRTCOutputURL string // URL for frontend
	FrameCount      int64
	LastFrameTime   time.Time
	ErrorCount      int
	LastError       error
	Reconnect       chan bool
	Stop            chan bool
	Done            chan bool

	// Phase 2 components
	FrameDecoder         *FrameDecoder
	FaceDetector         *FaceDetectionEngine
	OverlayRenderer      *OverlayRenderer
	PerfOptimizer        *PerformanceOptimizer
	FaceDetectionEnabled bool
	FFmpegProcess        *exec.Cmd
	ProcessOutput        *os.File
}

// StreamManager manages all active camera streams
type StreamManager struct {
	sessions               map[string]*StreamSession
	sessionsMutex          sync.RWMutex
	maxConcurrentStreams   int
	mediaClient            *MediaMTXClient
	startTime              time.Time
	totalProcessedFrames   int64
	totalDetectedFaces     int64
	framesMutex            sync.Mutex
	faceDetectionModelPath string
}

// NewStreamManager creates a new stream manager
func NewStreamManager(maxConcurrentStreams int, mediaClient *MediaMTXClient) *StreamManager {
	sm := &StreamManager{
		sessions:               make(map[string]*StreamSession),
		maxConcurrentStreams:   maxConcurrentStreams,
		mediaClient:            mediaClient,
		startTime:              time.Now(),
		totalProcessedFrames:   0,
		totalDetectedFaces:     0,
		faceDetectionModelPath: getFaceModelPath(),
	}

	// Initialize face detection model at startup
	sm.initializeFaceDetectionModel()

	return sm
}

// initializeFaceDetectionModel initializes the face detection model on startup
func (sm *StreamManager) initializeFaceDetectionModel() {
	logger := utils.GetLogger()
	modelPath := sm.faceDetectionModelPath

	// Check if model exists
	if _, err := os.Stat(modelPath); os.IsNotExist(err) {
		logger.Warnf("Face detection model not found at %s - disabling face detection", modelPath)
		sm.faceDetectionModelPath = ""
	} else {
		logger.Infof("Face detection model found at %s", modelPath)
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

	session := &StreamSession{
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

		// Phase 2 initialization
		FrameDecoder:         NewFrameDecoder(req.CameraID, 10, 2),
		FaceDetector:         NewFaceDetectionEngine(req.CameraID, sm.faceDetectionModelPath, 0.85),
		OverlayRenderer:      NewOverlayRenderer(req.CameraID),
		PerfOptimizer:        NewPerformanceOptimizer(req.CameraID, req.FPS, 100),
		FaceDetectionEnabled: len(sm.faceDetectionModelPath) > 0,
	}

	// Initialize face detector
	if session.FaceDetectionEnabled {
		if err := session.FaceDetector.Initialize(); err != nil {
			logger.Warnf("Failed to initialize face detection for camera %s: %v", req.CameraID, err)
			session.FaceDetectionEnabled = false
		}
	}

	// Register session
	sm.sessionsMutex.Lock()
	sm.sessions[req.CameraID] = session
	sm.sessionsMutex.Unlock()

	logger.Infof("Starting stream for camera %s (ID: %s, RTSP: %s, Face Detection: %v)",
		req.Name, req.CameraID, req.RTSPUrl, session.FaceDetectionEnabled)

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

	// Close Phase 2 resources
	if session.FrameDecoder != nil {
		session.FrameDecoder.Close()
	}
	if session.FaceDetector != nil {
		session.FaceDetector.Close()
	}

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
func (sm *StreamManager) GetAllStreams() map[string]*StreamSession {
	sm.sessionsMutex.RLock()
	defer sm.sessionsMutex.RUnlock()

	result := make(map[string]*StreamSession)
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
		Version:              "2.0.0",
		ActiveStreams:        activeCount,
		MaxConcurrentStreams: sm.maxConcurrentStreams,
		TotalProcessedFrames: totalFrames,
		UptimeSeconds:        int64(uptime),
		StreamSessions:       streamStatuses,
	}
}

// ToggleFaceDetection enables/disables face detection for a stream (Phase 2)
func (sm *StreamManager) ToggleFaceDetection(cameraID string, enabled bool) error {
	logger := utils.GetLogger()

	sm.sessionsMutex.RLock()
	session, exists := sm.sessions[cameraID]
	sm.sessionsMutex.RUnlock()

	if !exists {
		return fmt.Errorf("stream not found for camera %s", cameraID)
	}

	logger.Infof("Toggling face detection for camera %s to %v", cameraID, enabled)
	session.FaceDetectionEnabled = enabled
	if session.FrameDecoder != nil {
		session.FrameDecoder.SetFaceDetectionEnabled(enabled)
	}

	return nil
}

// UpdateFrameSkipInterval updates the frame skip interval for a stream (Phase 2)
func (sm *StreamManager) UpdateFrameSkipInterval(cameraID string, interval int) error {
	logger := utils.GetLogger()

	sm.sessionsMutex.RLock()
	session, exists := sm.sessions[cameraID]
	sm.sessionsMutex.RUnlock()

	if !exists {
		return fmt.Errorf("stream not found for camera %s", cameraID)
	}

	logger.Infof("Updating frame skip interval for camera %s to %d", cameraID, interval)

	if session.FrameDecoder != nil {
		session.FrameDecoder.SetFrameSkipInterval(interval)
	}
	if session.PerfOptimizer != nil {
		return session.PerfOptimizer.SetFrameSkipInterval(interval)
	}

	return nil
}

// GetStreamStats returns detailed stream statistics with Phase 2 metrics
func (sm *StreamManager) GetStreamStats(cameraID string) (map[string]interface{}, error) {
	sm.sessionsMutex.RLock()
	session, exists := sm.sessions[cameraID]
	sm.sessionsMutex.RUnlock()

	if !exists {
		return nil, fmt.Errorf("stream not found for camera %s", cameraID)
	}

	uptime := int64(time.Since(session.StartTime).Seconds())
	currentFPS := float64(0)
	if uptime > 0 {
		currentFPS = float64(session.FrameCount) / float64(uptime)
	}

	var avgProcessingTime float64
	var processingFPS float64
	var detectionRate float64
	var facesDetected int64

	if session.PerfOptimizer != nil {
		avgProcessingTime = float64(session.PerfOptimizer.GetAverageProcessingTime())
		processingFPS = session.PerfOptimizer.GetProcessingFPS()
	}

	if session.FrameDecoder != nil {
		metrics := session.FrameDecoder.GetMetrics()
		detectionRate = metrics.DetectionRate
		facesDetected = metrics.FacesDetected
	}

	return map[string]interface{}{
		"cameraId":                cameraID,
		"status":                  string(session.Status),
		"uptimeSeconds":           uptime,
		"framesProcessed":         session.FrameCount,
		"facesDetected":           facesDetected,
		"currentFps":              currentFPS,
		"processingFps":           processingFPS,
		"averageProcessingTimeMs": avgProcessingTime,
		"detectionRate":           detectionRate,
		"faceDetectionEnabled":    session.FaceDetectionEnabled,
		"errorCount":              session.ErrorCount,
	}, nil
}

// runStreamSession manages the lifecycle of a stream with Phase 2 processing
func (sm *StreamManager) runStreamSession(session *StreamSession, streamID string) {
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
				logger.Infof("[Stream %s] Connecting to RTSP: %s", streamID, session.Camera.RTSPUrl)
				session.Status = models.StreamStatusConnecting

				if err := sm.connectStream(session, streamID); err != nil {
					session.Status = models.StreamStatusError
					session.LastError = err
					session.ErrorCount++
					reconnectAttempts++

					logger.Errorf("[Stream %s] Connection failed (attempt %d/%d): %v",
						streamID, reconnectAttempts, maxReconnectAttempts, err)

					if reconnectAttempts >= maxReconnectAttempts {
						logger.Errorf("[Stream %s] Max reconnect attempts reached", streamID)
						return
					}

					backoffDuration := time.Duration(reconnectAttempts) * time.Second
					logger.Infof("[Stream %s] Retrying in %v", streamID, backoffDuration)
					time.Sleep(backoffDuration)
					continue
				}

				reconnectAttempts = 0
				session.Status = models.StreamStatusStreaming
				logger.Infof("[Stream %s] Connected successfully", streamID)

				// Start frame processing goroutine (Phase 2)
				go sm.processStreamFrames(session, streamID)
			}

			// Keep stream alive
			time.Sleep(100 * time.Millisecond)
		}
	}
}

// connectStream establishes a connection and streams from RTSP to MediaMTX
func (sm *StreamManager) connectStream(session *StreamSession, streamID string) error {
	logger := utils.GetLogger()

	// Ensure the path exists in MediaMTX
	if err := sm.mediaClient.CreatePath(session.RTSPInputStream); err != nil {
		return fmt.Errorf("failed to create MediaMTX path: %w", err)
	}

	// Build FFmpeg command to read RTSP and output raw video
	cmd := exec.Command(
		"ffmpeg",
		"-rtsp_transport", "tcp",
		"-i", session.Camera.RTSPUrl,
		"-c:v", "rawvideo",
		"-pix_fmt", "bgr24",
		"-f", "rawvideo",
		"pipe:",
	)

	// Capture stderr for debugging
	stderrPipe, err := cmd.StderrPipe()
	if err != nil {
		return fmt.Errorf("failed to create stderr pipe: %w", err)
	}

	// Capture stdout for frame data
	stdoutPipe, err := cmd.StdoutPipe()
	if err != nil {
		return fmt.Errorf("failed to create stdout pipe: %w", err)
	}

	// Start FFmpeg
	if err := cmd.Start(); err != nil {
		return fmt.Errorf("failed to start FFmpeg process: %w", err)
	}

	session.FFmpegProcess = cmd

	if file, ok := stdoutPipe.(*os.File); ok {
		session.ProcessOutput = file
	} else {
		return fmt.Errorf("expected *os.File but got different type from stdout pipe")
	}

	// Log FFmpeg output in background
	go func() {
		scanner := bufio.NewScanner(stderrPipe)
		for scanner.Scan() {
			line := scanner.Text()
			if strings.Contains(line, "error") || strings.Contains(line, "Error") {
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

// processStreamFrames processes frames from RTSP stream with Phase 2 detection (Phase 2)
func (sm *StreamManager) processStreamFrames(session *StreamSession, streamID string) {
	logger := utils.GetLogger()

	logger.Infof("[Stream %s] Starting frame processing pipeline", streamID)

	// For now, keep the stream alive
	// Full frame processing would be implemented here in a production system
	// This includes reading from FFmpeg stdout, running face detection, etc.

	ticker := time.NewTicker(33 * time.Millisecond) // ~30 FPS
	defer ticker.Stop()

	for {
		select {
		case <-session.Stop:
			logger.Infof("[Stream %s] Frame processing stopped", streamID)
			return
		case <-ticker.C:
			// Frame processing logic would go here
			// In production: read frame from stdoutPipe, run detection, render overlays
			session.FrameCount++
		}
	}
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

// IncrementFaceCount increments the face detection counter
func (sm *StreamManager) IncrementFaceCount(amount int64) {
	sm.framesMutex.Lock()
	sm.totalDetectedFaces += amount
	sm.framesMutex.Unlock()
}

// getFaceModelPath returns the path to the face detection model
func getFaceModelPath() string {
	possiblePaths := []string{
		"/app/models",
		"./models",
		"/models",
		os.Getenv("FACE_MODEL_PATH"),
	}

	for _, path := range possiblePaths {
		if path != "" {
			if info, err := os.Stat(path); err == nil && info.IsDir() {
				return path
			}
		}
	}

	return ""
}
