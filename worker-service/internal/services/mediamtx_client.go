package services

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"worker-service/internal/utils"
)

// MediaMTXClient handles communication with MediaMTX API
type MediaMTXClient struct {
	baseURL    string
	httpClient *http.Client
}

// MediaMTXPath represents a MediaMTX path configuration
type MediaMTXPath struct {
	Source   string `json:"source,omitempty"`
	Protocol string `json:"protocol,omitempty"`
}

// MediaMTXPathInfo contains info about a MediaMTX path
type MediaMTXPathInfo struct {
	Name   string `json:"name,omitempty"`
	Ready  bool   `json:"ready,omitempty"`
	Tracks []struct {
		Codec string `json:"codec,omitempty"`
	} `json:"tracks,omitempty"`
}

// NewMediaMTXClient creates a new MediaMTX client
func NewMediaMTXClient(baseURL string) *MediaMTXClient {
	return &MediaMTXClient{
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

// CreatePath creates a new path in MediaMTX for a camera stream
func (c *MediaMTXClient) CreatePath(pathName string) error {
	logger := utils.GetLogger()

	// Check if path already exists
	if exists, _ := c.PathExists(pathName); exists {
		logger.Infof("MediaMTX path '%s' already exists", pathName)
		return nil
	}

	// Create path by making a request to the MediaMTX API
	// MediaMTX will auto-create paths when streams are published to them
	logger.Infof("MediaMTX will auto-create path '%s' when stream is published", pathName)

	return nil
}

// PathExists checks if a path exists in MediaMTX
func (c *MediaMTXClient) PathExists(pathName string) (bool, error) {
	logger := utils.GetLogger()
	url := fmt.Sprintf("%s/v1/paths/list", c.baseURL)

	resp, err := c.httpClient.Get(url)
	if err != nil {
		logger.Warnf("Failed to check MediaMTX paths: %v", err)
		return false, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return false, err
	}

	// Handle empty response
	if len(body) == 0 || string(body) == "null" {
		return false, nil
	}

	var pathsList struct {
		Items []struct {
			Name string `json:"name"`
		} `json:"items"`
	}

	if err := json.Unmarshal(body, &pathsList); err != nil {
		// MediaMTX will auto-create paths
		logger.Debugf("Could not parse paths list (may be empty): %v", err)
		return false, nil
	}

	for _, item := range pathsList.Items {
		if item.Name == pathName {
			return true, nil
		}
	}

	return false, nil
}

// GetPathInfo retrieves information about a specific path
func (c *MediaMTXClient) GetPathInfo(pathName string) (*MediaMTXPathInfo, error) {
	logger := utils.GetLogger()

	url := fmt.Sprintf("%s/v1/paths/get/%s", c.baseURL, pathName)

	resp, err := c.httpClient.Get(url)
	if err != nil {
		logger.Errorf("Failed to get path info: %v", err)
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		logger.Warnf("MediaMTX returned status %d: %s", resp.StatusCode, string(body))
		return nil, fmt.Errorf("path not found or error: status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var pathInfo MediaMTXPathInfo
	if err := json.Unmarshal(body, &pathInfo); err != nil {
		logger.Errorf("Failed to parse path info: %v", err)
		return nil, err
	}

	return &pathInfo, nil
}

// DeletePath removes a path from MediaMTX
func (c *MediaMTXClient) DeletePath(pathName string) error {
	logger := utils.GetLogger()

	url := fmt.Sprintf("%s/v1/paths/delete/%s", c.baseURL, pathName)

	req, err := http.NewRequest(http.MethodDelete, url, nil)
	if err != nil {
		return err
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		logger.Errorf("Failed to delete path: %v", err)
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		logger.Warnf("MediaMTX delete returned status %d: %s", resp.StatusCode, string(body))
		return fmt.Errorf("failed to delete path: status %d", resp.StatusCode)
	}

	logger.Infof("Path '%s' deleted from MediaMTX", pathName)
	return nil
}

// GetAllPaths retrieves all paths from MediaMTX
func (c *MediaMTXClient) GetAllPaths() ([]string, error) {
	logger := utils.GetLogger()

	url := fmt.Sprintf("%s/v1/paths/list", c.baseURL)

	resp, err := c.httpClient.Get(url)
	if err != nil {
		logger.Errorf("Failed to list paths: %v", err)
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var pathsList struct {
		Items []struct {
			Name string `json:"name"`
		} `json:"items"`
	}

	if err := json.Unmarshal(body, &pathsList); err != nil {
		logger.Errorf("Failed to parse paths: %v", err)
		return nil, err
	}

	var paths []string
	for _, item := range pathsList.Items {
		paths = append(paths, item.Name)
	}

	return paths, nil
}

// IsHealthy checks if MediaMTX is accessible and healthy and returns (healthy, message)
func (c *MediaMTXClient) IsHealthy() (bool, string) {
	logger := utils.GetLogger()
	url := fmt.Sprintf("%s/v1/paths/list", c.baseURL)

	resp, err := c.httpClient.Get(url)
	if err != nil {
		msg := fmt.Sprintf("could not connect - %v", err)
		logger.Warnf("MediaMTX health check failed: %s", msg)
		return false, msg
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		msg := fmt.Sprintf("status code %d", resp.StatusCode)
		logger.Warnf("MediaMTX health check failed: %s", msg)
		return false, msg
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		msg := fmt.Sprintf("could not read body - %v", err)
		logger.Warnf("MediaMTX health check failed: %s", msg)
		return false, msg
	}

	var pathsList struct {
		Items []struct {
			Name string `json:"name"`
		} `json:"items"`
	}

	if err := json.Unmarshal(body, &pathsList); err != nil {
		msg := fmt.Sprintf("could not parse JSON - %v", err)
		logger.Warnf("MediaMTX health check failed: %s", msg)
		return false, msg
	}

	if len(pathsList.Items) == 0 {
		msg := "MediaMTX running but no paths exist yet"
		logger.Infof(msg)
		return false, msg
	}

	msg := fmt.Sprintf("MediaMTX is healthy: %d paths available", len(pathsList.Items))
	logger.Infof(msg)
	return true, msg
}
