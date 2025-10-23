package models

import (
	"io"
	"os/exec"
	"time"
)

// StreamSession represents an active camera stream
type StreamSession struct {
	// Identity
	CameraID string
	Camera   *Camera

	// State
	Status    StreamStatus
	StartTime time.Time

	// Metrics
	FrameCount    int64
	LastFrameTime time.Time
	ErrorCount    int
	LastError     error

	// Control channels
	Reconnect chan bool
	Stop      chan bool
	Done      chan bool

	// FFmpeg processes
	InputFFmpeg  *FFmpegProcess
	OutputFFmpeg *FFmpegProcess

	// Configuration
	FaceDetectionEnabled bool
}

// FFmpegProcess wraps an FFmpeg process for cleaner management
type FFmpegProcess struct {
	Cmd         *exec.Cmd
	StdinPipe   io.WriteCloser
	StdoutPipe  io.ReadCloser
	StreamID    string
	ProcessType string // "input" or "output"
}

// IsRunning checks if FFmpeg process is still running
func (fp *FFmpegProcess) IsRunning() bool {
	if fp.Cmd == nil || fp.Cmd.ProcessState == nil {
		return true // Not started yet or still running
	}
	return !fp.Cmd.ProcessState.Exited()
}

// Kill terminates the FFmpeg process
func (fp *FFmpegProcess) Kill() error {
	if fp.Cmd != nil && fp.Cmd.Process != nil {
		return fp.Cmd.Process.Kill()
	}
	return nil
}

// Close closes all pipes and kills the process
func (fp *FFmpegProcess) Close() {
	if fp.StdinPipe != nil {
		fp.StdinPipe.Close()
	}
	if fp.StdoutPipe != nil {
		fp.StdoutPipe.Close()
	}
	fp.Kill()
}

// NewStreamSession creates a new stream session
func NewStreamSession(cameraID, name, rtspUrl string, fps int) *StreamSession {
	return &StreamSession{
		CameraID:             cameraID,
		Camera:               &Camera{ID: cameraID, Name: name, RTSPUrl: rtspUrl, FPS: fps},
		Status:               StreamStatusConnecting,
		StartTime:            time.Now(),
		Reconnect:            make(chan bool, 1),
		Stop:                 make(chan bool, 1),
		Done:                 make(chan bool, 1),
		FaceDetectionEnabled: false,
	}
}
