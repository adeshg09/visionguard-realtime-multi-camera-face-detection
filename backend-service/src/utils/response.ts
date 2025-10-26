/* Imports */
import type { Context } from "hono";
import type { StatusCode } from "hono/utils/http-status";

/* Local Imports */
import { RESPONSE_MESSAGES, STATUS_CODES } from "@/constants/index.js";

// ----------------------------------------------------------------------

interface SuccessResponseData {
  status: {
    response_code: StatusCode;
    response_message: string;
  };
  message: any;
  data?: any;
}

interface ErrorResponseData {
  status: {
    response_code: StatusCode;
    response_message: string;
  };
  message: any;
  error?: {
    message: any;
    stack: any;
  };
}

// ----------------------------------------------------------------------

/**
 * Returns a successful API response with the given status code, response message, and data.
 *
 * @param {Context} c - Hono context object
 * @param {StatusCode} [response_code=200] - HTTP status code
 * @param {string} [response_message="Success!"] - Response message
 * @param {any} message - Response message
 * @param {any} [data=undefined] - Response data
 * @returns {Response} - Hono response object
 */
export const successResponse = (
  c: Context,
  response_code: StatusCode = STATUS_CODES.OK,
  response_message: string = RESPONSE_MESSAGES.SUCCESS,
  message: any,
  data?: any
): Response => {
  c.status(response_code);
  return c.json({
    status: {
      response_code,
      response_message,
    },
    message,
    data,
  } as SuccessResponseData);
};

/**
 * Returns an error API response with the given status code, response message, and error details.
 *
 * @param {Context} c - Hono context object
 * @param {StatusCode} [response_code=400] - HTTP status code
 * @param {string} [response_message="Internal Server Error!"] - Response message
 * @param {any} [error=undefined] - Error details
 * @returns {Response} - Hono response object
 */
export const errorResponse = (
  c: Context,
  response_code: StatusCode = STATUS_CODES.BAD_REQUEST,
  response_message: string = RESPONSE_MESSAGES.SERVER_ERROR,
  error?: any
): Response => {
  c.status(response_code);
  return c.json({
    status: {
      response_code,
      response_message,
    },
    message: error?.message,
    error: error ? { message: error.message, stack: error.stack } : undefined,
  } as ErrorResponseData);
};
