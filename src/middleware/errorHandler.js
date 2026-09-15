/**
 * Central Error Handling Middleware
 * Catches all errors and maps them to the frozen API standard error envelope.
 */
export const errorHandler = (err, req, res, next) => {
  console.error('[Error Stack]', err);

  let statusCode = err.statusCode || err.status || 500;
  let code = err.code || 'INTERNAL_SERVER_ERROR';
  let message = err.message || 'An unexpected server error occurred.';
  let details = err.details || null;

  // Mongoose Validation Error (400 Bad Request)
  if (err.name === 'ValidationError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Validation failed for request data.';
    details = {};
    for (const field in err.errors) {
      details[field] = err.errors[field].message;
    }
  }

  // Mongoose Duplicate Key Error (409 Conflict)
  if (err.code === 11000) {
    statusCode = 409;
    code = 'DUPLICATE_RESOURCE';
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    message = `A resource with this ${field} already exists.`;
    details = { field };
  }

  // Mongoose Cast Error / Invalid ObjectId (400 Bad Request)
  if (err.name === 'CastError') {
    statusCode = 400;
    code = 'INVALID_ID_FORMAT';
    message = `Invalid format for identifier: ${err.value}`;
  }

  // JWT Errors (401 Unauthorized)
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    code = 'UNAUTHORIZED';
    message = 'Invalid authentication token.';
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    code = 'TOKEN_EXPIRED';
    message = 'Authentication token has expired. Please log in again.';
  }

  // Multer Errors (400 Bad Request)
  if (err.name === 'MulterError') {
    statusCode = 400;
    code = 'FILE_UPLOAD_ERROR';
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'Uploaded file exceeds the maximum 10MB size limit.';
    } else {
      message = err.message;
    }
  }

  const responsePayload = {
    success: false,
    message,
    error: {
      code
    }
  };

  if (details) {
    responsePayload.error.details = details;
  }

  return res.status(statusCode).json(responsePayload);
};
