package utils

import (
	"os"

	"github.com/sirupsen/logrus"
)

// Logger is a global logger instance
var Logger *logrus.Logger

// InitLogger initializes the global logger with specified level
func InitLogger(logLevel string) {
	Logger = logrus.New()
	Logger.Out = os.Stdout

	// Set formatter for better readability
	Logger.SetFormatter(&logrus.TextFormatter{
		FullTimestamp:   true,
		TimestampFormat: "2006-01-02 15:04:05",
		ForceColors:     true,
	})

	// Set log level
	level, err := logrus.ParseLevel(logLevel)
	if err != nil {
		level = logrus.InfoLevel
	}
	Logger.SetLevel(level)
}

// GetLogger returns the global logger instance
func GetLogger() *logrus.Logger {
	if Logger == nil {
		InitLogger("info")
	}
	return Logger
}
