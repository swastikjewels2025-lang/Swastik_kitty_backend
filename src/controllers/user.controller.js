import { User } from '../models/index.js';
import { 
  validateDocumentNumber, 
  maskDocumentNumber, 
  generateKycReferenceId 
} from '../services/kyc.service.js';

export const submitKycController = async (req, res, next) => {
  try {
    const { documentType, documentNumber, consentAgreed } = req.body;
    const file = req.file;

    // Validate consent
    if (!consentAgreed || (consentAgreed !== 'true' && consentAgreed !== true)) {
      return res.fail(
        'Statutory compliance consent is required.', 
        400, 
        'VALIDATION_ERROR', 
        { field: 'consentAgreed' }
      );
    }

    // Validate document type
    const normalizedType = documentType ? documentType.toUpperCase() : '';
    if (!['AADHAAR', 'PAN'].includes(normalizedType)) {
      return res.fail(
        'Invalid document type. Allowed types are AADHAAR or PAN.', 
        400, 
        'VALIDATION_ERROR', 
        { field: 'documentType' }
      );
    }

    // Validate document number format
    if (!documentNumber || !validateDocumentNumber(normalizedType, documentNumber)) {
      const hint = normalizedType === 'AADHAAR' 
        ? 'Aadhaar must be a 12-digit number.' 
        : 'PAN must be a 10-character alphanumeric code (e.g. ABCDE1234F).';
      return res.fail(
        `Invalid ${normalizedType} format. ${hint}`, 
        400, 
        'VALIDATION_ERROR', 
        { field: 'documentNumber' }
      );
    }

    // Validate file presence
    if (!file) {
      return res.fail(
        'Document image or PDF file is required.', 
        400, 
        'VALIDATION_ERROR', 
        { field: 'file' }
      );
    }

    const referenceId = generateKycReferenceId();
    const documentNumberMasked = maskDocumentNumber(normalizedType, documentNumber);
    
    // In production, file buffer is streamed to Cloudinary
    const documentUrl = `https://res.cloudinary.com/swastik/image/upload/kyc/${referenceId.toLowerCase()}.jpg`;

    // Update user document in database
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.fail('User not found.', 404, 'USER_NOT_FOUND');
    }

    user.kyc = {
      documentType: normalizedType,
      documentNumber: documentNumber.trim().toUpperCase(),
      documentNumberMasked,
      documentUrl,
      status: 'PENDING',
      referenceId,
      isVerified: false,
      submittedAt: new Date(),
      rejectionReason: null
    };

    await user.save();

    return res.ok({
      referenceId,
      status: 'PENDING',
      documentType: normalizedType,
      documentNumberMasked,
      documentUrl
    }, 'KYC document submitted successfully.');
  } catch (error) {
    next(error);
  }
};

export const getProfileController = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.fail('User profile not found.', 404, 'USER_NOT_FOUND');
    }

    return res.ok({
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
          status: user.kyc?.status || 'NOT_SUBMITTED',
          referenceId: user.kyc?.referenceId || null
        },
        createdAt: user.createdAt
      }
    }, 'User profile retrieved.');
  } catch (error) {
    next(error);
  }
};
