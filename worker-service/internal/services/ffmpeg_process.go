package services

// ----------------------------------------------------------------------

import (
	"io"
	"os/exec"
)

// ----------------------------------------------------------------------

type FFmpegProcess struct {
	cmd         *exec.Cmd
	stdinPipe   io.WriteCloser
	stdoutPipe  io.ReadCloser
	streamID    string
	processType string
}

// ----------------------------------------------------------------------

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
