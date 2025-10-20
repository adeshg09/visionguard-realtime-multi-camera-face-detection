package config

import (
	"fmt"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

// Config holds all configuration for the worker service
type Config struct {
	// Server configuration
	Port     int
	GinMode  string
	LogLevel string

	// Backend service configuration
	BackendServiceURL   string
	BackendWorkerAPIKey string

	// MediaMTX configuration
	MediaMTXHost       string
	MediaMTXRTSPPort   int
	MediaMTXHLSPort    int
	MediaMTXWebRTCPort int
	MediaMTXRTMPPort   int
	MediaMTXAPIURL     string

	// Stream processing configuration
	MaxConcurrentStreams int
	FrameSkipInterval    int
	StreamConnectTimeout int // seconds

	// Storage configuration
	SnapshotStoragePath string
}

// LoadConfig loads configuration from environment variables
func LoadConfig() (*Config, error) {
	// Load .env file if it exists (optional)
	_ = godotenv.Load()

	config := &Config{
		Port:                 getEnvInt("WORKER_SERVICE_PORT", 5000),
		GinMode:              getEnvString("GIN_MODE", "debug"),
		LogLevel:             getEnvString("LOG_LEVEL", "info"),
		BackendServiceURL:    getEnvString("BACKEND_SERVICE_URL", "http://backend:3000"),
		BackendWorkerAPIKey:  getEnvString("BACKEND_WORKER_API_KEY", ""),
		MediaMTXHost:         getEnvString("MEDIAMTX_HOST", "localhost"),
		MediaMTXRTSPPort:     getEnvInt("MEDIAMTX_RTSP_PORT", 8554),
		MediaMTXHLSPort:      getEnvInt("MEDIAMTX_HLS_PORT", 8888),
		MediaMTXWebRTCPort:   getEnvInt("MEDIAMTX_WEBRTC_PORT", 8889),
		MediaMTXRTMPPort:     getEnvInt("MEDIAMTX_RTMP_PORT", 1935),
		MediaMTXAPIURL:       getEnvString("MEDIAMTX_API_URL", "http://mediamtx:9997"),
		MaxConcurrentStreams: getEnvInt("MAX_CONCURRENT_STREAMS", 4),
		FrameSkipInterval:    getEnvInt("FRAME_SKIP_INTERVAL", 2),
		StreamConnectTimeout: getEnvInt("STREAM_CONNECT_TIMEOUT", 30),
		SnapshotStoragePath:  getEnvString("SNAPSHOT_STORAGE_PATH", "/tmp/visionguard/snapshots"),
		
	}

	// Validate configuration
	if err := config.Validate(); err != nil {
		return nil, err
	}

	return config, nil
}

// Validate performs basic validation of configuration
func (c *Config) Validate() error {
	if c.Port < 1 || c.Port > 65535 {
		return fmt.Errorf("invalid port: %d", c.Port)
	}

	if c.BackendServiceURL == "" {
		return fmt.Errorf("BACKEND_SERVICE_URL is required")
	}

	if c.BackendWorkerAPIKey == "" {
		return fmt.Errorf("BACKEND_WORKER_API_KEY is required")
	}

	if c.MaxConcurrentStreams < 1 {
		return fmt.Errorf("MAX_CONCURRENT_STREAMS must be at least 1")
	}

	if c.FrameSkipInterval < 1 {
		return fmt.Errorf("FRAME_SKIP_INTERVAL must be at least 1")
	}

	return nil
}

// Helper functions
func getEnvString(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intVal, err := strconv.Atoi(value); err == nil {
			return intVal
		}
	}
	return defaultValue
}
