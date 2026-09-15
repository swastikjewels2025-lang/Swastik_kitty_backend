import multer from 'multer';

// Multer memory storage (allows validation and in-memory streaming to Cloudinary or local test storage)
const storage = multer.memoryStorage();

export const kycUpload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit as per contract freeze
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and PDF files are accepted.'));
    }
  }
});

/**
 * Validates document number format
 */
export const validateDocumentNumber = (type, number) => {
  if (!number || typeof number !== 'string') return false;
  const clean = number.trim().toUpperCase();

  if (type === 'AADHAAR') {
    // 12-digit numeric
    return /^\d{12}$/.test(clean);
  } else if (type === 'PAN') {
    // 10 alphanumeric: 5 letters, 4 digits, 1 letter
    return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(clean);
  }
  return false;
};

/**
 * Masks document number for customer privacy
 */
export const maskDocumentNumber = (type, number) => {
  const clean = number.trim().toUpperCase();
  if (type === 'AADHAAR') {
    return `XXXX XXXX ${clean.slice(-4)}`;
  } else if (type === 'PAN') {
    return `XXXXXX${clean.slice(-4)}`;
  }
  return clean;
};

/**
 * Generates unique human-readable reference ID
 */
export const generateKycReferenceId = () => {
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return `KYC-${randomNum}`;
};
