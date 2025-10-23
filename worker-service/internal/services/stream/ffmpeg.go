package stream

import (
	"bufio"
	"fmt"
	"io"
	"os/exec"
	"strings"
	"worker-service/internal/models"
	"worker-service/internal/utils"
)

// FFmpegManager handles FFmpeg process creation and monitoring
type FFmpegManager struct{}

// NewFFmpegManager creates a new FFmpeg manager
func NewFFmpegManager() *FFmpegManager {
	return &FFmpegManager{}
}

// StartInputFFmpeg starts the input FFmpeg process for reading RTSP stream
func (fm *FFmpegManager) StartInputFFmpeg(session *models.StreamSession) error {
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

	session.InputFFmpeg = &models.FFmpegProcess{
		Cmd:         cmd,
		StdoutPipe:  stdoutPipe,
		StreamID:    session.CameraID,
		ProcessType: "input",
	}

	go fm.monitorFFmpegLogs(stderrPipe, session.CameraID, "input")
	go fm.monitorFFmpegProcess(session.InputFFmpeg, session)

	return nil
}

// StartOutputFFmpeg starts the output FFmpeg process for streaming to MediaMTX
func (fm *FFmpegManager) StartOutputFFmpeg(session *models.StreamSession) error {
	fps := session.Camera.FPS
	if fps == 0 {
		fps = utils.DefaultFPS
	}

	mediaPath := fmt.Sprintf("camera_%s", session.CameraID)

	cmd := exec.Command(
		"ffmpeg",
		"-f", "rawvideo",
		"-vcodec", "rawvideo",
		"-pix_fmt", "bgr24",
		"-s", fmt.Sprintf("%dx%d", utils.DefaultFrameWidth, utils.DefaultFrameHeight),
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
		fmt.Sprintf("rtmp://mediamtx:%d/%s", utils.MediaMTXRTMPPort, mediaPath),
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

	session.OutputFFmpeg = &models.FFmpegProcess{
		Cmd:         cmd,
		StdinPipe:   stdin,
		StreamID:    session.CameraID,
		ProcessType: "output",
	}

	go fm.monitorFFmpegLogs(stderr, session.CameraID, "output")
	go fm.monitorFFmpegProcess(session.OutputFFmpeg, session)

	return nil
}

// monitorFFmpegLogs monitors FFmpeg stderr for errors
func (fm *FFmpegManager) monitorFFmpegLogs(pipe io.ReadCloser, cameraID, processType string) {
	logger := utils.GetLogger()
	scanner := bufio.NewScanner(pipe)

	for scanner.Scan() {
		line := scanner.Text()
		if strings.Contains(strings.ToLower(line), "error") {
			logger.Warnf("[%s FFmpeg %s] %s", cameraID, processType, line)
		}
	}
}

// monitorFFmpegProcess monitors FFmpeg process exit
func (fm *FFmpegManager) monitorFFmpegProcess(ffmpeg *models.FFmpegProcess, session *models.StreamSession) {
	logger := utils.GetLogger()

	if err := ffmpeg.Cmd.Wait(); err != nil {
		logger.Errorf("[%s FFmpeg %s] Process exited: %v",
			session.CameraID, ffmpeg.ProcessType, err)
		session.LastError = err
		session.Status = models.StreamStatusError
	}
}

// CleanupFFmpegProcesses closes all FFmpeg processes for a session
func (fm *FFmpegManager) CleanupFFmpegProcesses(session *models.StreamSession) {
	if session.InputFFmpeg != nil {
		session.InputFFmpeg.Close()
	}
	if session.OutputFFmpeg != nil {
		session.OutputFFmpeg.Close()
	}
}
