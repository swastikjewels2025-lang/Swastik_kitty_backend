/**
 * 404 Route Not Found Middleware
 */
export const notFoundHandler = (req, res) => {
  return res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl}`,
    error: {
      code: 'ROUTE_NOT_FOUND',
      details: {
        path: req.originalUrl,
        method: req.method
      }
    }
  });
};
