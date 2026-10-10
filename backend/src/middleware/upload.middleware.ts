import multer from 'multer';

import { ALLOWED_SALARY_SLIP_MIME_TYPES, MAX_UPLOAD_SIZE_BYTES } from '../constants';

export const salarySlipUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_SIZE_BYTES, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (ALLOWED_SALARY_SLIP_MIME_TYPES.includes(file.mimetype as (typeof ALLOWED_SALARY_SLIP_MIME_TYPES)[number])) {
      callback(null, true);
      return;
    }
    callback(new Error('Salary slip must be a PDF, JPG, or PNG file.'));
  },
});
