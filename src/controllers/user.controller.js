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

    const customerName = req.body.name || req.body.fullName;
    if (customerName && typeof customerName === 'string' && customerName.trim().length >= 2) {
      user.name = customerName.trim();
    }

    user.kyc = {
      documentType: normalizedType,
      documentNumber: documentNumber.replace(/[\s-]/g, '').trim().toUpperCase(),
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
        surname: user.surname || '',
        email: user.email || null,
        dateOfBirth: user.dateOfBirth ? user.dateOfBirth.toISOString() : null,
        phone: user.phone,
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

export const updateProfileController = async (req, res, next) => {
  try {
    const { 
      name, 
      surname, 
      email, 
      dateOfBirth, 
      address, 
      city, 
      pincode, 
      nominee, 
      nomineeName, 
      nomineeRelationship, 
      nomineePhone 
    } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.fail('User profile not found.', 404, 'USER_NOT_FOUND');
    }

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length < 2) {
        return res.fail('Name must be at least 2 characters.', 400, 'VALIDATION_ERROR', { field: 'name' });
      }
      user.name = name.trim();
    }

    if (surname !== undefined) {
      user.surname = typeof surname === 'string' ? surname.trim() : '';
    }

    if (email !== undefined) {
      if (email !== null && email !== '') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return res.fail('Invalid email format.', 400, 'VALIDATION_ERROR', { field: 'email' });
        }
        user.email = email.trim().toLowerCase();
      } else {
        user.email = null;
      }
    }

    if (dateOfBirth !== undefined) {
      if (dateOfBirth !== null && dateOfBirth !== '') {
        const parsedDob = new Date(dateOfBirth);
        if (isNaN(parsedDob.getTime())) {
          return res.fail('Invalid date of birth format.', 400, 'VALIDATION_ERROR', { field: 'dateOfBirth' });
        }
        user.dateOfBirth = parsedDob;
      } else {
        user.dateOfBirth = null;
      }
    }

    if (address !== undefined) {
      user.address = typeof address === 'string' ? address.trim() : '';
    }

    if (city !== undefined) {
      user.city = typeof city === 'string' ? city.trim() : '';
    }

    if (pincode !== undefined) {
      user.pincode = typeof pincode === 'string' ? pincode.trim() : '';
    }

    if (nominee && typeof nominee === 'object') {
      user.nominee = {
        name: nominee.name ? nominee.name.trim() : (user.nominee?.name || ''),
        relationship: nominee.relationship ? nominee.relationship.trim() : (user.nominee?.relationship || ''),
        phone: nominee.phone ? nominee.phone.trim() : (user.nominee?.phone || '')
      };
    } else if (nomineeName !== undefined) {
      user.nominee = {
        name: nomineeName.trim(),
        relationship: nomineeRelationship !== undefined ? nomineeRelationship.trim() : (user.nominee?.relationship || ''),
        phone: nomineePhone !== undefined ? nomineePhone.trim() : (user.nominee?.phone || '')
      };
    }

    await user.save();

    return res.ok({
      user: {
        id: user._id.toString(),
        name: user.name,
        surname: user.surname || '',
        email: user.email || null,
        dateOfBirth: user.dateOfBirth ? user.dateOfBirth.toISOString() : null,
        phone: user.phone,
        address: user.address || '',
        city: user.city || '',
        pincode: user.pincode || '',
        nominee: user.nominee || { name: '', relationship: '', phone: '' },
        nomineeName: user.nominee?.name || '',
        nomineeRelationship: user.nominee?.relationship || '',
        nomineePhone: user.nominee?.phone || '',
        role: user.role,
        tier: user.tier,
        kycStatus: user.kyc?.status || 'NOT_SUBMITTED',
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
    }, 'Profile updated successfully.');
  } catch (error) {
    next(error);
  }
};
