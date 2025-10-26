package services

// ----------------------------------------------------------------------

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"os/exec"
	"strconv"
	"strings"
	"time"
	"worker-service/internal/models"
	"worker-service/internal/utils"
)

// ----------------------------------------------------------------------

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
	fps := session.targetFPS
	if fps == 0 {
		fps = session.detectedMaxFPS
	}

	mediaPath := fmt.Sprintf("camera_%s", session.CameraID)

	cmd := exec.Command(
		"ffmpeg",
		"-f", "rawvideo",
		"-vcodec", "rawvideo",
		"-pix_fmt", "bgr24",
		"-s", fmt.Sprintf("%dx%d", session.detectedWidth, session.detectedHeight),
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
		fmt.Sprintf("rtmp://%s:%d/%s", sm.config.MediaMTXHost, sm.config.MediaMTXRTMPPort, mediaPath),
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

func (sm *StreamManager) probeStreamInfo(rtspUrl string) (width, height, fps int, err error) {
	logger := utils.GetLogger()
	logger.Infof("Probing stream info for: %s", rtspUrl)

	// Add timeout and better error handling
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Use ffprobe with proper JSON output
	cmd := exec.CommandContext(ctx, "ffprobe",
		"-v", "quiet",
		"-print_format", "json",
		"-show_streams",
		"-select_streams", "v:0",
		"-rtsp_transport", "tcp", // Force TCP transport
		"-analyzeduration", "10M",
		"-probesize", "10M",
		rtspUrl,
	)

	output, err := cmd.Output()
	if err != nil {
		logger.Warnf("Failed to probe stream %s: %v", rtspUrl, err)
		// Return safe defaults
		return 640, 480, 15, nil
	}

	// Parse JSON response
	var result struct {
		Streams []struct {
			Width        int    `json:"width"`
			Height       int    `json:"height"`
			RFrameRate   string `json:"r_frame_rate"`
			AvgFrameRate string `json:"avg_frame_rate"`
			CodecType    string `json:"codec_type"`
		} `json:"streams"`
	}

	if err := json.Unmarshal(output, &result); err != nil {
		logger.Warnf("Failed to parse ffprobe output: %v", err)
		return 640, 480, 15, nil
	}

	// Find video stream
	for _, stream := range result.Streams {
		if stream.CodecType == "video" {
			width = stream.Width
			height = stream.Height

			// Try avg_frame_rate first (more reliable), fall back to r_frame_rate
			fpsStr := stream.AvgFrameRate
			if fpsStr == "0/0" || fpsStr == "" {
				fpsStr = stream.RFrameRate
			}

			fps = parseFPS(fpsStr)

			// Sanity check FPS (should be between 1-120 for real cameras)
			if fps <= 0 || fps > 120 {
				logger.Warnf("Invalid FPS detected (%d), using default 15", fps)
				fps = 15
			}

			break
		}
	}

	// Validate dimensions
	if width == 0 || height == 0 {
		width, height = 640, 480
	}
	if fps == 0 {
		fps = 15
	}

	logger.Infof("Stream probed: %dx%d @ %dfps", width, height, fps)
	return width, height, fps, nil
}

func parseFPS(fpsStr string) int {
	parts := strings.Split(strings.TrimSpace(fpsStr), "/")
	if len(parts) == 2 {
		num, err1 := strconv.Atoi(parts[0])
		den, err2 := strconv.Atoi(parts[1])
		if err1 == nil && err2 == nil && den > 0 {
			calculatedFPS := num / den
			// Additional sanity check
			if calculatedFPS > 0 && calculatedFPS <= 120 {
				return calculatedFPS
			}
		}
	}
	return 0
}

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
