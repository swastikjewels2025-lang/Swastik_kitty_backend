/**
 * Response Envelope Middleware
 * Attaches helper methods to res object to enforce the frozen API response format.
 *
 * Success envelope:
 * {
 *   "success": true,
 *   "message": "...",
 *   "data": { ... },
 *   "meta": { ... } // optional pagination
 * }
 *
 * Error envelope:
 * {
 *   "success": false,
 *   "message": "...",
 *   "error": {
 *     "code": "ERROR_CODE",
 *     "details": { ... }
 *   }
 * }
 */
export const responseEnvelope = (req, res, next) => {
  // Success response (200 OK)
  res.ok = (data = {}, message = 'Operation completed successfully.', meta = undefined) => {
    const payload = {
      success: true,
      message,
      data
    };
    if (meta !== undefined) {
      payload.meta = meta;
    }
    return res.status(200).json(payload);
  };

  // Created response (201 Created)
  res.created = (data = {}, message = 'Resource created successfully.') => {
    return res.status(201).json({
      success: true,
      message,
      data
    });
  };

  // No content (204 No Content)
  res.noContent = () => {
    return res.status(204).send();
  };

  // Failure response (4xx / 5xx)
  res.fail = (message = 'An error occurred.', statusCode = 400, code = 'BAD_REQUEST', details = null) => {
    const payload = {
      success: false,
      message,
      error: {
        code
      }
    };
    if (details) {
      payload.error.details = details;
    }
    return res.status(statusCode).json(payload);
  };

  next();
};
