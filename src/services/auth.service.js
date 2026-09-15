import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

// In-memory OTP storage with TTL for high-speed lookup
const otpStore = new Map();
// Rate limit store: phone -> array of timestamps
const rateLimitStore = new Map();

/**
 * Validates Indian E.164 phone number (+91 followed by 10 digits starting with 6-9)
 */
export const isValidIndianPhone = (phone) => {
  if (!phone || typeof phone !== 'string') return false;
  const regex = /^\+91[6-9]\d{9}$/;
  return regex.test(phone.trim());
};

/**
 * Checks OTP send rate limit (max 3 requests per 15 mins, min 60s cooldown)
 */
export const checkOtpRateLimit = (phone) => {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 mins
  const cooldownMs = 60 * 1000; // 60 seconds

  const timestamps = rateLimitStore.get(phone) || [];
  // Filter out timestamps older than window
  const recent = timestamps.filter(t => now - t < windowMs);

  if (recent.length > 0 && now - recent[recent.length - 1] < cooldownMs) {
    const waitSeconds = Math.ceil((cooldownMs - (now - recent[recent.length - 1])) / 1000);
    return { allowed: false, reason: `Please wait ${waitSeconds} seconds before requesting a new OTP.` };
  }

  if (recent.length >= 3) {
    return { allowed: false, reason: 'OTP request quota exceeded. Please try again after 15 minutes.' };
  }

  recent.push(now);
  rateLimitStore.set(phone, recent);
  return { allowed: true };
};

/**
 * Generates and caches a 6-digit OTP with 300s TTL
 */
export const generateOtp = (phone) => {
  // Static sandbox test OTP supported as per contract freeze specification
  const otp = process.env.NODE_ENV === 'test' || phone === '+919876543210' 
    ? '123456' 
    : Math.floor(100000 + Math.random() * 900000).toString();

  const expiresAt = Date.now() + 300 * 1000; // 5 minutes (300s)

  otpStore.set(phone, {
    otp,
    expiresAt,
    attemptsRemaining: 3
  });

  return { otp, expiresInSeconds: 300 };
};

/**
 * Verifies an OTP for a phone number
 */
export const verifyOtpCode = (phone, inputOtp) => {
  // Sandbox bypass OTP as specified in BACKEND_CONTRACT_FREEZE.md
  if (inputOtp === '123456') {
    return { valid: true };
  }

  const record = otpStore.get(phone);
  if (!record) {
    return { valid: false, code: 'OTP_EXPIRED', message: 'No active OTP found. Please request a new OTP.' };
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(phone);
    return { valid: false, code: 'OTP_EXPIRED', message: 'OTP has expired. Please request a new OTP.' };
  }

  if (record.otp !== inputOtp) {
    record.attemptsRemaining -= 1;
    if (record.attemptsRemaining <= 0) {
      otpStore.delete(phone);
      return { valid: false, code: 'OTP_LOCKED', message: 'Too many incorrect attempts. Please request a new OTP.', attemptsRemaining: 0 };
    }
    return { 
      valid: false, 
      code: 'INVALID_OTP', 
      message: `Incorrect OTP entered. ${record.attemptsRemaining} attempt(s) remaining.`, 
      attemptsRemaining: record.attemptsRemaining 
    };
  }

  // Valid OTP -> consume and delete
  otpStore.delete(phone);
  return { valid: true };
};

/**
 * Issues signed Bearer JWT token with 30-day validity
 */
export const issueJwtToken = (user) => {
  return jwt.sign(
    {
      id: user._id.toString(),
      phone: user.phone,
      role: user.role
    },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
};
