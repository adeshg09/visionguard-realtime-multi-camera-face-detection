package utils

import (
	"os"
	"time"

	"github.com/sirupsen/logrus"
)

var logger *logrus.Logger

// InitLogger initializes the global logger
func InitLogger(logLevel string) {
	logger = logrus.New()

	// Set output to stdout
	logger.SetOutput(os.Stdout)

	// Set log level
	level, err := logrus.ParseLevel(logLevel)
	if err != nil {
		level = logrus.InfoLevel
	}
	logger.SetLevel(level)

	// Set formatter
	logger.SetFormatter(&logrus.TextFormatter{
		FullTimestamp:   true,
		TimestampFormat: "2006-01-02 15:04:05",
		ForceColors:     true,
	})

	logger.Infof("Logger initialized with level: %s", logLevel)
}

// GetLogger returns the global logger instance
func GetLogger() *logrus.Logger {
	if logger == nil {
		InitLogger("info")
	}
	return logger
}

// GetCurrentTime returns the current time
func GetCurrentTime() time.Time {
	return time.Now()
}
