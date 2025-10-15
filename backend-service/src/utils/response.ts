import type { Context } from "hono";
import type { StatusCode } from "hono/utils/http-status";
import { RESPONSE_MESSAGES, STATUS_CODES } from "../constants/index.js";

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
