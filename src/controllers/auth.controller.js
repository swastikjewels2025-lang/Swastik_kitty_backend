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

    const existingUser = await User.findOne({ phone: phone.trim() });
    const isExistingUser = !!(existingUser && existingUser.name && existingUser.name !== 'Patron');
    const userName = isExistingUser ? existingUser.name : null;

    return res.ok({
      phone,
      expiresInSeconds,
      isExistingUser,
      userName,
      message: isExistingUser ? `Welcome back, ${userName}!` : 'OTP sent successfully.'
    }, isExistingUser ? `Welcome back, ${userName}!` : 'OTP sent successfully.');
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
    } else if (!user.name || user.name === 'Patron') {
      isNewUser = true;
    }

    const token = issueJwtToken(user);

    return res.ok({
      token,
      isNewUser,
      user: {
        id: user._id.toString(),
        name: user.name || '',
        surname: user.surname || '',
        email: user.email || '',
        phone: user.phone,
        dateOfBirth: user.dateOfBirth ? user.dateOfBirth.toISOString() : null,
        address: user.address || '',
        city: user.city || '',
        pincode: user.pincode || '',
        nominee: user.nominee || { name: '', relationship: '', phone: '' },
        nomineeName: user.nominee?.name || '',
        nomineeRelationship: user.nominee?.relationship || '',
        nomineePhone: user.nominee?.phone || '',
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
    }, isNewUser ? 'Authentication successful.' : `Welcome back, ${user.name}!`);
  } catch (error) {
    next(error);
  }
};

export const logoutController = async (req, res) => {
  return res.ok({}, 'Logged out successfully.');
};

export const googleAuthExchangeController = async (req, res, next) => {
  try {
    const { idToken, email, name, phone } = req.body;

    if (!idToken || !email) {
      return res.fail('Google idToken and email are required.', 400, 'VALIDATION_ERROR');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.fail('Invalid email format.', 400, 'VALIDATION_ERROR', { field: 'email' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const queryConditions = [{ email: normalizedEmail }];
    if (phone) {
      queryConditions.push({ phone: phone.trim() });
    }

    let user = await User.findOne({ $or: queryConditions });
    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      const assignedPhone = phone && isValidIndianPhone(phone) 
        ? phone.trim() 
        : `+9190${Date.now().toString().slice(-8)}`;

      user = await User.create({
        name: name ? name.trim() : 'Google Patron',
        email: normalizedEmail,
        phone: assignedPhone,
        role: 'CUSTOMER',
        tier: 'Standard Member'
      });
    } else {
      if (!user.email) {
        user.email = normalizedEmail;
        await user.save();
      }
    }

    const token = issueJwtToken(user);

    return res.ok({
      token,
      isNewUser,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
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
    }, 'Google authentication successful.');
  } catch (error) {
    next(error);
  }
};

/**
 * Direct Administrator Login with credentials (e.g. admin / admin123)
 */
export const adminLoginController = async (req, res, next) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.fail('Username/identifier and password are required.', 400, 'VALIDATION_ERROR');
    }

    const isValidAdmin = (identifier.trim().toLowerCase() === 'admin' || identifier.trim() === '+919999999999') && password === 'admin123';

    if (!isValidAdmin) {
      return res.fail('Invalid administrative credentials.', 401, 'INVALID_CREDENTIALS');
    }

    let admin = await User.findOne({ phone: '+919999999999' });
    if (!admin) {
      admin = await User.create({
        name: 'Admin',
        phone: '+919999999999',
        role: 'SUPER_ADMIN',
        tier: 'Vault Administrator'
      });
    }

    const token = issueJwtToken(admin);

    return res.ok({
      token,
      user: {
        id: admin._id.toString(),
        name: admin.name,
        username: 'admin',
        phone: admin.phone,
        role: 'admin',
        tier: admin.tier
      }
    }, 'Administrator logged in successfully.');
  } catch (error) {
    next(error);
  }
};


