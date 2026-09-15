import { User } from '../models/index.js';
import { 
  isValidIndianPhone, 
  checkOtpRateLimit, 
  generateOtp, 
  verifyOtpCode, 
  issueJwtToken 
} from '../services/auth.service.js';

export const sendOtpController = async (req, res, next) => {
  try {
    const { phone } = req.body;

    if (!phone || !isValidIndianPhone(phone)) {
      return res.fail(
        'Invalid phone number format. Must be an Indian number starting with +91 (e.g. +919876543210).', 
        400, 
        'VALIDATION_ERROR', 
        { field: 'phone' }
      );
    }

    const rateCheck = checkOtpRateLimit(phone);
    if (!rateCheck.allowed) {
      return res.fail(rateCheck.reason, 429, 'RATE_LIMIT_EXCEEDED');
    }

    const { otp, expiresInSeconds } = generateOtp(phone);

    // In production, this calls MSG91 / Twilio SMS gateway
    console.log(`[SMS Gateway] Dispatched OTP ${otp} to ${phone} (Valid for ${expiresInSeconds}s)`);

    return res.ok({
      phone,
      expiresInSeconds
    }, 'OTP sent successfully.');
  } catch (error) {
    next(error);
  }
};

export const verifyOtpController = async (req, res, next) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !isValidIndianPhone(phone)) {
      return res.fail('Invalid phone number format.', 400, 'VALIDATION_ERROR', { field: 'phone' });
    }

    if (!otp || typeof otp !== 'string' || otp.trim().length !== 6) {
      return res.fail('OTP must be a 6-digit number.', 400, 'VALIDATION_ERROR', { field: 'otp' });
    }

    const verification = verifyOtpCode(phone, otp.trim());
    if (!verification.valid) {
      return res.fail(
        verification.message, 
        400, 
        verification.code, 
        verification.attemptsRemaining !== undefined ? { attemptsRemaining: verification.attemptsRemaining } : null
      );
    }

    // Check if user exists or atomically create
    let user = await User.findOne({ phone: phone.trim() });
    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      user = await User.create({
        phone: phone.trim(),
        name: 'Patron',
        role: 'CUSTOMER',
        tier: 'Standard Member'
      });
    }

    const token = issueJwtToken(user);

    return res.ok({
      token,
      isNewUser,
      user: {
        id: user._id.toString(),
        name: user.name,
        phone: user.phone,
        role: user.role,
        tier: user.tier,
        kyc: {
          isVerified: user.kyc?.isVerified || false,
          documentType: user.kyc?.documentType || null,
          documentNumberMasked: user.kyc?.documentNumberMasked || null,
          documentUrl: user.kyc?.documentUrl || null,
          status: user.kyc?.status || 'NOT_SUBMITTED'
        }
      }
    }, 'Authentication successful.');
  } catch (error) {
    next(error);
  }
};

export const logoutController = async (req, res) => {
  return res.ok({}, 'Logged out successfully.');
};
