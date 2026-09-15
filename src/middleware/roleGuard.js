/**
 * Role-Based Access Control Middleware
 * @param  {...string} allowedRoles Roles allowed to access the route
 */
export const roleGuard = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.fail('User not authenticated.', 401, 'UNAUTHORIZED');
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.fail(
        'Access denied. You do not have sufficient permissions to access this administrative resource.',
        403,
        'FORBIDDEN'
      );
    }

    next();
  };
};
