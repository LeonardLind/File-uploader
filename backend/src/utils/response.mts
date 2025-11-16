// utils/response.mts

export type SuccessResponse<T = unknown> = {
  success: true;
  message: string;
  data: T | null;
};

export type FailureResponse = {
  status: number;
  payload: {
    success: false;
    message: string;
    error?: string;
  };
};

/**
 * Standard success response wrapper
 */
export function success<T = unknown>(
  message: string,
  data: T | null = null
): SuccessResponse<T> {
  return { success: true, message, data };
}

/**
 * Standard failure response wrapper
 */
export function failure(
  message: string,
  error: unknown = null,
  status = 500
): FailureResponse {
  let errMessage: string | undefined = undefined;

  if (typeof error === "string") {
    errMessage = error;
  } else if (error instanceof Error) {
    errMessage = error.message;
  }

  return {
    status,
    payload: {
      success: false,
      message,
      ...(errMessage ? { error: errMessage } : {}),
    },
  };
}
