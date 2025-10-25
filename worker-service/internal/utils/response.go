package utils

// ----------------------------------------------------------------------

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// ----------------------------------------------------------------------

// Status codes
const (
	StatusOK           = http.StatusOK                  // 200
	StatusCreated      = http.StatusCreated             // 201
	StatusBadRequest   = http.StatusBadRequest          // 400
	StatusUnauthorized = http.StatusUnauthorized        // 401
	StatusForbidden    = http.StatusForbidden           // 403
	StatusNotFound     = http.StatusNotFound            // 404
	StatusConflict     = http.StatusConflict            // 409
	StatusServerError  = http.StatusInternalServerError // 500
)

// Response messages
const (
	ResponseSuccess         = "Success!"
	ResponseBadRequest      = "Bad Request!"
	ResponseUnauthorized    = "Unauthorized!"
	ResponseForbidden       = "Forbidden!"
	ResponseNotFound        = "Not Found!"
	ResponseServerError     = "Internal Server Error!"
	ResponseValidationError = "Validation Error!"
	ResponseResourceExists  = "Resource already exists!"
)

// ----------------------------------------------------------------------

// StatusInfo represents the status object in responses
type StatusInfo struct {
	ResponseCode    int    `json:"response_code"`
	ResponseMessage string `json:"response_message"`
}

// SuccessResponse represents a successful API response
type SuccessResponse struct {
	Status  StatusInfo  `json:"status"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

// ErrorResponse represents an error API response
type ErrorResponse struct {
	Status  StatusInfo   `json:"status"`
	Message string       `json:"message"`
	Error   *ErrorDetail `json:"error,omitempty"`
}

// ErrorDetail contains error details
type ErrorDetail struct {
	Message string `json:"message"`
	Stack   string `json:"stack,omitempty"`
}

// ----------------------------------------------------------------------

// SendSuccessResponse sends a standardized success response
func SendSuccessResponse(c *gin.Context, statusCode int, responseMessage string, message string, data interface{}) {
	c.JSON(statusCode, SuccessResponse{
		Status: StatusInfo{
			ResponseCode:    statusCode,
			ResponseMessage: responseMessage,
		},
		Message: message,
		Data:    data,
	})
}

// SendErrorResponse sends a standardized error response
func SendErrorResponse(c *gin.Context, statusCode int, responseMessage string, err error) {
	errorDetail := &ErrorDetail{
		Message: err.Error(),
	}

	c.JSON(statusCode, ErrorResponse{
		Status: StatusInfo{
			ResponseCode:    statusCode,
			ResponseMessage: responseMessage,
		},
		Message: err.Error(),
		Error:   errorDetail,
	})
}

// ----------------------------------------------------------------------

// Helper functions for common responses
func SuccessOK(c *gin.Context, message string, data interface{}) {
	SendSuccessResponse(c, StatusOK, ResponseSuccess, message, data)
}

func SuccessCreated(c *gin.Context, message string, data interface{}) {
	SendSuccessResponse(c, StatusCreated, ResponseSuccess, message, data)
}

func ErrorBadRequest(c *gin.Context, err error) {
	SendErrorResponse(c, StatusBadRequest, ResponseBadRequest, err)
}

func ErrorUnauthorized(c *gin.Context, err error) {
	SendErrorResponse(c, StatusUnauthorized, ResponseUnauthorized, err)
}

func ErrorNotFound(c *gin.Context, err error) {
	SendErrorResponse(c, StatusNotFound, ResponseNotFound, err)
}

func ErrorConflict(c *gin.Context, err error) {
	SendErrorResponse(c, StatusConflict, ResponseResourceExists, err)
}

func ErrorServerError(c *gin.Context, err error) {
	SendErrorResponse(c, StatusServerError, ResponseServerError, err)
}
