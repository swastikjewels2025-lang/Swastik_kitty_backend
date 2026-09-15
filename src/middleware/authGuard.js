import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { User } from '../models/index.js';

/**
 * Authentication Guard Middleware
 * Validates Authorization: Bearer <token>
 * Dispatches HTTP 401 on missing, expired, or malformed tokens.
 */
export const authGuard = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.fail(
        'Authentication required. Please provide a valid Bearer token in the Authorization header.',
        401,
        'UNAUTHORIZED'
      );
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.secret);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.fail('Authentication token has expired. Please log in again.', 401, 'TOKEN_EXPIRED');
      }
      return res.fail('Invalid authentication token.', 401, 'UNAUTHORIZED');
    }

    // Verify user still exists in database
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.fail('User account associated with this token was not found.', 401, 'USER_NOT_FOUND');
    }

    req.user = user;
    req.tokenPayload = decoded;
    next();
  } catch (error) {
    next(error);
  }
};
