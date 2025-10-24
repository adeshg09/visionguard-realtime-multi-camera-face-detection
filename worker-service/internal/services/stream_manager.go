package services

import (
	"bufio"
	"fmt"
	"io"
	"os"
	"os/exec"
	"strings"
	"sync"
	"time"
	"worker-service/internal/models"
	"worker-service/internal/utils"

	"github.com/google/uuid"
	"gocv.io/x/gocv"
)

// ==================== CONFIGURATION ====================

const (
	defaultFrameWidth    = 1920
	defaultFrameHeight   = 1080
	defaultFPS           = 30
	defaultBytesPerPixel = 3 // BGR24

	maxReconnectAttempts = 5
	maxConsecutiveErrors = 10
	connectionTimeout    = 2 * time.Second
	stopTimeout          = 5 * time.Second

	mediaMTXRTMPPort   = 1935
	mediaMTXWebRTCPort = 8889
	mediaMTXHLSPort    = 8888
	mediaMTXRTSPPort   = 8554
)

// ==================== STREAM SESSION ====================

type StreamSession struct {
	// Identity
	CameraID string
	Camera   *models.Camera

	// State
	Status    models.StreamStatus
	StartTime time.Time

	// Control channels
	Stop chan bool
	Done chan bool

	// Processing pipeline
	inputFFmpeg  *FFmpegProcess
	outputFFmpeg *FFmpegProcess
	faceDetector *FaceDetectionEngine
	overlay      *OverlayRenderer

	// Configuration
	faceDetectionEnabled bool
	frameSkipInterval    int // Process every Nth frame
}

// ==================== FFMPEG WRAPPER ====================

type FFmpegProcess struct {
	cmd         *exec.Cmd
	stdinPipe   io.WriteCloser
	stdoutPipe  io.ReadCloser
	streamID    string
	processType string
}

func (fp *FFmpegProcess) Start() error {
	return fp.cmd.Start()
}

func (fp *FFmpegProcess) Kill() error {
	if fp.cmd != nil && fp.cmd.Process != nil {
		return fp.cmd.Process.Kill()
	}
	return nil
}

func (fp *FFmpegProcess) IsRunning() bool {
	if fp.cmd == nil || fp.cmd.ProcessState == nil {
		return true
	}
	return !fp.cmd.ProcessState.Exited()
}

func (fp *FFmpegProcess) Close() {
	if fp.stdinPipe != nil {
		fp.stdinPipe.Close()
	}
	if fp.stdoutPipe != nil {
		fp.stdoutPipe.Close()
	}
	fp.Kill()
}

// ==================== STREAM MANAGER ====================

type StreamManager struct {
	sessions               map[string]*StreamSession
	sessionsMutex          sync.RWMutex
	maxConcurrentStreams   int
	mediamtxClient         *MediaMTXClient
	faceDetectionModelPath string
}

// StartStreamResponse is the response for starting a stream
type StartStreamResponse struct {
	CameraID     string `json:"cameraId"`
	StreamID     string `json:"streamId"`
	MediaMTXPath string `json:"mediamtxPath"`
	WebRTCUrl    string `json:"webrtcUrl"`
	HLSUrl       string `json:"hlsUrl"`
	RTSPUrl      string `json:"rtspUrl"`
	RTMPUrl      string `json:"rtmpUrl"`
}

// ==================== INITIALIZATION ====================

func NewStreamManager(maxConcurrentStreams int, mediamtxClient *MediaMTXClient) *StreamManager {
	sm := &StreamManager{
		sessions:               make(map[string]*StreamSession),
		maxConcurrentStreams:   maxConcurrentStreams,
		mediamtxClient:         mediamtxClient,
		faceDetectionModelPath: findFaceDetectionModel(),
	}

	if sm.faceDetectionModelPath == "" {
		utils.GetLogger().Warn("Face detection model not found - feature disabled")
	} else {
		utils.GetLogger().Infof("Face detection model found at %s", sm.faceDetectionModelPath)
	}

	return sm
}

func findFaceDetectionModel() string {
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

// ==================== START STREAM ====================

func (sm *StreamManager) StartStream(req *models.StartStreamRequest) (*StartStreamResponse, error) {
	logger := utils.GetLogger()

	// Validation
	if err := sm.validateStreamStart(req.CameraID); err != nil {
		return nil, err
	}

	// Create session
	session := &StreamSession{
		CameraID: req.CameraID,
		Camera: &models.Camera{
			ID:         req.CameraID,
			Name:       req.Name,
			RTSPUrl:    req.RTSPUrl,
			Location:   req.Location,
			Resolution: req.Resolution,
			FPS:        req.FPS,
		},
		Status:               models.StreamStatusConnecting,
		StartTime:            time.Now(),
		Stop:                 make(chan bool, 1),
		Done:                 make(chan bool, 1),
		faceDetector:         NewFaceDetectionEngine(req.CameraID, sm.faceDetectionModelPath, 0.85),
		overlay:              NewOverlayRenderer(req.CameraID),
		faceDetectionEnabled: len(sm.faceDetectionModelPath) > 0,
		frameSkipInterval:    2, // Process every 2nd frame by default
	}

	// Initialize face detection if available
	if session.faceDetectionEnabled {
		if err := session.faceDetector.Initialize(); err != nil {
			logger.Warnf("Face detection disabled for camera %s: %v", session.CameraID, err)
			session.faceDetectionEnabled = false
		}
	}

	// Register and start
	sm.registerSession(session)
	go sm.runStreamSession(session)

	// Wait for stream to be actually accessible
	if err := sm.verifyStreamIsLive(session.CameraID, 15, 2*time.Second); err != nil {
		sm.cleanupFailedSession(session)
		return nil, fmt.Errorf("stream failed to start: %v", err)
	}

	logger.Infof("Stream started and verified live: camera=%s, faceDetection=%v", req.Name, session.faceDetectionEnabled)

	return sm.buildStreamResponse(req, session), nil
}

func (sm *StreamManager) validateStreamStart(cameraID string) error {
	sm.sessionsMutex.RLock()
	defer sm.sessionsMutex.RUnlock()

	if _, exists := sm.sessions[cameraID]; exists {
		return fmt.Errorf("stream already active for camera %s", cameraID)
	}

	if len(sm.sessions) >= sm.maxConcurrentStreams {
		return fmt.Errorf("maximum concurrent streams (%d) reached", sm.maxConcurrentStreams)
	}

	return nil
}

// verifyStreamIsLive checks if the stream is actually available on MediaMTX
func (sm *StreamManager) verifyStreamIsLive(cameraID string, maxAttempts int, retryDelay time.Duration) error {
	logger := utils.GetLogger()
	mediaPath := fmt.Sprintf("camera_%s", cameraID)

	for attempt := 1; attempt <= maxAttempts; attempt++ {
		logger.Infof("Verifying stream for camera %s (attempt %d/%d)", cameraID, attempt, maxAttempts)

		// Check if stream session is still active
		session, err := sm.getSession(cameraID)
		if err != nil {
			return fmt.Errorf("stream session not found")
		}

		if session.Status == models.StreamStatusError {
			return fmt.Errorf("stream entered error state")
		}

		// Check FFmpeg processes
		if session.inputFFmpeg != nil && !session.inputFFmpeg.IsRunning() {
			return fmt.Errorf("input FFmpeg process died")
		}
		if session.outputFFmpeg != nil && !session.outputFFmpeg.IsRunning() {
			return fmt.Errorf("output FFmpeg process died")
		}

		// Method 1: Check if RTMP is actively publishing
		isPublishing, _ := sm.mediamtxClient.IsPathPublishing(mediaPath)
		if isPublishing {
			logger.Infof("✓ Stream verified - RTMP publisher active for camera %s", cameraID)
			return nil
		}

		// Method 2: Try to get path info
		pathInfo, err := sm.mediamtxClient.GetPathInfo(mediaPath)
		if err == nil && pathInfo != nil && pathInfo.Ready && pathInfo.HasVideoTrack() {
			logger.Infof("✓ Stream verified - path ready with video tracks for camera %s", cameraID)
			return nil
		}

		// Method 3: Check if path exists in list (after attempt 6)
		if attempt >= 6 {
			exists, _ := sm.mediamtxClient.PathExists(mediaPath)
			if exists {
				logger.Infof("✓ Stream verified - path exists in list for camera %s", cameraID)
				return nil
			}
		}

		// Wait before retry
		if attempt < maxAttempts {
			time.Sleep(retryDelay)
		}
	}

	return fmt.Errorf("stream did not become available after %d attempts", maxAttempts)
}

// cleanupFailedSession cleans up a session that failed to start
func (sm *StreamManager) cleanupFailedSession(session *StreamSession) {
	logger := utils.GetLogger()
	logger.Warnf("Cleaning up failed session for camera %s", session.CameraID)

	if session.faceDetector != nil {
		session.faceDetector.Close()
	}
	if session.inputFFmpeg != nil {
		session.inputFFmpeg.Close()
	}
	if session.outputFFmpeg != nil {
		session.outputFFmpeg.Close()
	}

	// Signal stop
	select {
	case session.Stop <- true:
	default:
	}

	sm.unregisterSession(session.CameraID)
}

func (sm *StreamManager) registerSession(session *StreamSession) {
	sm.sessionsMutex.Lock()
	sm.sessions[session.CameraID] = session
	sm.sessionsMutex.Unlock()
}

func (sm *StreamManager) unregisterSession(cameraID string) {
	sm.sessionsMutex.Lock()
	delete(sm.sessions, cameraID)
	sm.sessionsMutex.Unlock()
}

func (sm *StreamManager) buildStreamResponse(req *models.StartStreamRequest, session *StreamSession) *StartStreamResponse {
	streamID := uuid.New().String()
	mediaPath := fmt.Sprintf("camera_%s", req.CameraID)

	return &StartStreamResponse{
		CameraID:     req.CameraID,
		StreamID:     streamID,
		MediaMTXPath: mediaPath,
		WebRTCUrl:    fmt.Sprintf("http://localhost:%d/%s", mediaMTXWebRTCPort, mediaPath),
		HLSUrl:       fmt.Sprintf("http://localhost:%d/%s/index.m3u8", mediaMTXHLSPort, mediaPath),
		RTSPUrl:      fmt.Sprintf("rtsp://localhost:%d/%s", mediaMTXRTSPPort, mediaPath),
		RTMPUrl:      fmt.Sprintf("rtmp://localhost:%d/%s", mediaMTXRTMPPort, mediaPath),
	}
}

// ==================== STOP STREAM ====================

func (sm *StreamManager) StopStream(cameraID string) (*models.StopStreamResponse, error) {
	logger := utils.GetLogger()

	session, err := sm.getSession(cameraID)
	if err != nil {
		return nil, err
	}

	logger.Infof("Stopping stream for camera %s", cameraID)

	// Cleanup resources
	if session.faceDetector != nil {
		session.faceDetector.Close()
	}
	if session.inputFFmpeg != nil {
		session.inputFFmpeg.Close()
	}
	if session.outputFFmpeg != nil {
		session.outputFFmpeg.Close()
	}

	// Signal stop
	select {
	case session.Stop <- true:
	default:
	}

	// Wait for completion
	select {
	case <-session.Done:
	case <-time.After(stopTimeout):
		logger.Warnf("Stream stop timeout for camera %s", cameraID)
	}

	// Unregister
	sm.unregisterSession(cameraID)

	logger.Infof("Stream stopped for camera %s", cameraID)

	return &models.StopStreamResponse{
		CameraID: cameraID,
	}, nil
}

func (sm *StreamManager) getSession(cameraID string) (*StreamSession, error) {
	sm.sessionsMutex.RLock()
	defer sm.sessionsMutex.RUnlock()

	session, exists := sm.sessions[cameraID]
	if !exists {
		return nil, fmt.Errorf("stream not found for camera %s", cameraID)
	}

	return session, nil
}

// ==================== STREAM EXECUTION ====================

func (sm *StreamManager) runStreamSession(session *StreamSession) {
	logger := utils.GetLogger()
	defer func() { session.Done <- true }()

	reconnectAttempts := 0

	for {
		select {
		case <-session.Stop:
			logger.Infof("Stop signal received for camera %s", session.CameraID)
			session.Status = models.StreamStatusStopped
			return

		default:
			if session.Status != models.StreamStatusStreaming {
				if err := sm.connectAndStream(session); err != nil {
					reconnectAttempts++
					logger.Warnf("Connection failed for camera %s (attempt %d): %v",
						session.CameraID, reconnectAttempts, err)

					if reconnectAttempts >= maxReconnectAttempts {
						logger.Errorf("Max reconnect attempts reached for camera %s", session.CameraID)
						session.Status = models.StreamStatusError
						return
					}

					backoff := time.Duration(reconnectAttempts) * time.Second
					time.Sleep(backoff)
					continue
				}

				reconnectAttempts = 0
				session.Status = models.StreamStatusStreaming
				logger.Infof("Camera %s connected successfully", session.CameraID)

				go sm.processFrames(session)
			}

			time.Sleep(100 * time.Millisecond)
		}
	}
}

func (sm *StreamManager) connectAndStream(session *StreamSession) error {
	logger := utils.GetLogger()
	logger.Infof("Connecting to RTSP: %s", session.Camera.RTSPUrl)

	session.Status = models.StreamStatusConnecting

	// Create MediaMTX path
	mediaPath := fmt.Sprintf("camera_%s", session.CameraID)
	if err := sm.mediamtxClient.CreatePath(mediaPath); err != nil {
		return err
	}

	// Start input FFmpeg
	if err := sm.startInputFFmpeg(session); err != nil {
		return err
	}

	// Start output FFmpeg
	if err := sm.startOutputFFmpeg(session); err != nil {
		session.inputFFmpeg.Close()
		return err
	}

	// Verify connection
	time.Sleep(5 * time.Second)
	if !session.inputFFmpeg.IsRunning() {
		return fmt.Errorf("FFmpeg exited immediately")
	}

	return nil
}

// ==================== FFMPEG MANAGEMENT ====================

func (sm *StreamManager) startInputFFmpeg(session *StreamSession) error {
	cmd := exec.Command(
		"ffmpeg",
		"-rtsp_transport", "tcp",
		"-i", session.Camera.RTSPUrl,
		"-c:v", "rawvideo",
		"-pix_fmt", "bgr24",
		"-f", "rawvideo",
		"pipe:1",
	)

	stderrPipe, err := cmd.StderrPipe()
	if err != nil {
		return fmt.Errorf("stderr pipe failed: %w", err)
	}

	stdoutPipe, err := cmd.StdoutPipe()
	if err != nil {
		return fmt.Errorf("stdout pipe failed: %w", err)
	}

	if err := cmd.Start(); err != nil {
		return fmt.Errorf("FFmpeg start failed: %w", err)
	}

	session.inputFFmpeg = &FFmpegProcess{
		cmd:         cmd,
		stdoutPipe:  stdoutPipe,
		streamID:    session.CameraID,
		processType: "input",
	}

	sm.monitorFFmpegLogs(stderrPipe, session.CameraID, "input")
	sm.monitorFFmpegProcess(session.inputFFmpeg, session)

	return nil
}

func (sm *StreamManager) startOutputFFmpeg(session *StreamSession) error {
	fps := session.Camera.FPS
	if fps == 0 {
		fps = defaultFPS
	}

	mediaPath := fmt.Sprintf("camera_%s", session.CameraID)

	cmd := exec.Command(
		"ffmpeg",
		"-f", "rawvideo",
		"-vcodec", "rawvideo",
		"-pix_fmt", "bgr24",
		"-s", fmt.Sprintf("%dx%d", defaultFrameWidth, defaultFrameHeight),
		"-r", fmt.Sprintf("%d", fps),
		"-i", "pipe:0",
		"-c:v", "libx264",
		"-preset", "ultrafast",
		"-tune", "zerolatency",
		"-pix_fmt", "yuv420p",
		"-profile:v", "baseline",
		"-level", "3.1",
		"-b:v", "2000k",
		"-maxrate", "2500k",
		"-bufsize", "5000k",
		"-g", fmt.Sprintf("%d", fps*2),
		"-f", "flv",
		fmt.Sprintf("rtmp://mediamtx:%d/%s", mediaMTXRTMPPort, mediaPath),
	)

	stdin, err := cmd.StdinPipe()
	if err != nil {
		return fmt.Errorf("stdin pipe failed: %w", err)
	}

	stderr, err := cmd.StderrPipe()
	if err != nil {
		stdin.Close()
		return fmt.Errorf("stderr pipe failed: %w", err)
	}

	if err := cmd.Start(); err != nil {
		stdin.Close()
		return fmt.Errorf("FFmpeg start failed: %w", err)
	}

	session.outputFFmpeg = &FFmpegProcess{
		cmd:         cmd,
		stdinPipe:   stdin,
		streamID:    session.CameraID,
		processType: "output",
	}

	sm.monitorFFmpegLogs(stderr, session.CameraID, "output")
	sm.monitorFFmpegProcess(session.outputFFmpeg, session)

	return nil
}

func (sm *StreamManager) monitorFFmpegLogs(pipe io.ReadCloser, cameraID, processType string) {
	logger := utils.GetLogger()

	go func() {
		scanner := bufio.NewScanner(pipe)
		for scanner.Scan() {
			line := scanner.Text()
			if strings.Contains(strings.ToLower(line), "error") {
				logger.Warnf("[%s FFmpeg %s] %s", cameraID, processType, line)
			}
		}
	}()
}

func (sm *StreamManager) monitorFFmpegProcess(ffmpeg *FFmpegProcess, session *StreamSession) {
	logger := utils.GetLogger()

	go func() {
		if err := ffmpeg.cmd.Wait(); err != nil {
			logger.Errorf("[%s FFmpeg %s] Process exited: %v",
				session.CameraID, ffmpeg.processType, err)
			session.Status = models.StreamStatusError
		}
	}()
}

// ==================== FRAME PROCESSING ====================

func (sm *StreamManager) processFrames(session *StreamSession) {
	logger := utils.GetLogger()
	logger.Infof("Starting frame processing for camera %s", session.CameraID)

	frameSize := defaultFrameWidth * defaultFrameHeight * defaultBytesPerPixel
	frameBuffer := make([]byte, frameSize)
	consecutiveErrors := 0
	skipCounter := 0

	for {
		select {
		case <-session.Stop:
			logger.Infof("Frame processing stopped for camera %s", session.CameraID)
			return

		default:
			// Read frame
			if session.inputFFmpeg == nil || session.inputFFmpeg.stdoutPipe == nil {
				logger.Errorf("Input pipe not available for camera %s", session.CameraID)
				return
			}

			n, err := io.ReadFull(session.inputFFmpeg.stdoutPipe, frameBuffer)
			if err != nil {
				consecutiveErrors++
				if err == io.EOF {
					logger.Warnf("Stream ended for camera %s", session.CameraID)
					return
				}
				if consecutiveErrors >= maxConsecutiveErrors {
					logger.Errorf("Too many errors for camera %s", session.CameraID)
					session.Status = models.StreamStatusError
					return
				}
				continue
			}

			if n != frameSize {
				continue
			}

			consecutiveErrors = 0

			// Frame skipping
			skipCounter++
			if skipCounter%session.frameSkipInterval != 0 {
				continue
			}

			// Convert to Mat
			mat, err := gocv.NewMatFromBytes(defaultFrameHeight, defaultFrameWidth, gocv.MatTypeCV8UC3, frameBuffer)
			if err != nil || mat.Empty() {
				if !mat.Empty() {
					mat.Close()
				}
				continue
			}

			// Detect faces
			var detections []models.FaceDetection
			if session.faceDetectionEnabled && session.faceDetector != nil {
				detections, _ = session.faceDetector.DetectFaces(mat)
			}

			// Render overlay
			if session.overlay != nil && session.overlay.IsEnabled() {
				session.overlay.RenderDetections(
					&mat,
					detections,
					session.Camera.Name,
					session.Camera.Location,
					0, // FPS not needed
					0, // Frame number not needed
				)
			}

			// Write to output
			if session.outputFFmpeg != nil && session.outputFFmpeg.stdinPipe != nil {
				rawBytes := mat.ToBytes()
				session.outputFFmpeg.stdinPipe.Write(rawBytes)
			}

			mat.Close()
		}
	}
}

// ==================== STATUS ====================

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

	uptime := time.Since(session.StartTime).Milliseconds()
	mediaPath := fmt.Sprintf("camera_%s", cameraID)

	return &models.StreamStatusResponse{
		CameraID:  cameraID,
		Status:    session.Status,
		IsActive:  session.Status == models.StreamStatusStreaming,
		UptimeMs:  uptime,
		WebRTCUrl: fmt.Sprintf("http://localhost:%d/%s", mediaMTXWebRTCPort, mediaPath),
		HLSUrl:    fmt.Sprintf("http://localhost:%d/%s/index.m3u8", mediaMTXHLSPort, mediaPath),
		RTSPUrl:   fmt.Sprintf("rtsp://localhost:%d/%s", mediaMTXRTSPPort, mediaPath),
		RTMPUrl:   fmt.Sprintf("rtmp://localhost:%d/%s", mediaMTXRTMPPort, mediaPath),
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

// ==================== CONFIGURATION ====================

func (sm *StreamManager) ToggleFaceDetection(cameraID string, enabled bool) error {
	logger := utils.GetLogger()

	session, err := sm.getSession(cameraID)
	if err != nil {
		return err
	}

	logger.Infof("Toggling face detection for camera %s to %v", cameraID, enabled)
	session.faceDetectionEnabled = enabled

	return nil
}

func (sm *StreamManager) UpdateFrameSkipInterval(cameraID string, interval int) error {
	logger := utils.GetLogger()

	session, err := sm.getSession(cameraID)
	if err != nil {
		return err
	}

	if interval < 1 || interval > 10 {
		return fmt.Errorf("invalid frame skip interval: %d (must be 1-10)", interval)
	}

	logger.Infof("Updating frame skip interval for camera %s to %d", cameraID, interval)
	session.frameSkipInterval = interval

	return nil
}
