import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';

import { env } from '../config/env';
import { SalarySlipMetadata } from '../types';

import { AppError } from '../utils/app-error';

const FILE_STORAGE_TIMEOUT_MS = 30_000;
const CLOUDINARY_FOLDER = 'creditsea/salary-slips';
const ALLOWED_REMOTE_FILE_TYPES = new Set(['application/pdf', 'application/octet-stream', 'image/jpeg', 'image/png']);

interface StoredFile {
  content: Buffer;
  mimeType?: string;
}

const getCloudinaryClient = () => {
  if (!env.cloudinaryCloudName || !env.cloudinaryApiKey || !env.cloudinaryApiSecret) {
    throw new AppError(
      503,
      'Cloudinary is not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to the backend environment.',
      'CLOUDINARY_NOT_CONFIGURED',
    );
  }

  cloudinary.config({
    cloud_name: env.cloudinaryCloudName,
    api_key: env.cloudinaryApiKey,
    api_secret: env.cloudinaryApiSecret,
    secure: true,
  });

  return cloudinary;
};

const getSafeProviderErrorMessage = (error: unknown): string => {
  const providerError = error as { message?: unknown };
  const message =
    typeof providerError.message === 'string' && providerError.message.trim() ? providerError.message.trim() : 'Unknown Cloudinary error.';
  return env.cloudinaryApiSecret ? message.split(env.cloudinaryApiSecret).join('[redacted]') : message;
};

const getCloudinaryFailure = (providerMessage: string, providerStatus?: number) => {
  if (providerStatus === 403 || /missing permissions|request forbidden|actions=.*create/i.test(providerMessage)) {
    return {
      code: 'CLOUDINARY_UPLOAD_FORBIDDEN',
      message: 'Cloudinary denied the upload. Grant this API key upload/create permission for the configured Product Environment.',
    };
  }

  if (/cloud_name mismatch|invalid api key|unauthorized/i.test(providerMessage)) {
    return {
      code: 'CLOUDINARY_CREDENTIALS_INVALID',
      message:
        'Cloudinary credentials do not match the configured cloud. Verify CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.',
    };
  }

  return {
    code: 'CLOUDINARY_UPLOAD_FAILED',
    message: 'Salary slip could not be uploaded to Cloudinary.',
  };
};

const uploadToCloudinary = (file: Express.Multer.File): Promise<UploadApiResponse> => {
  const client = getCloudinaryClient();

  return new Promise((resolve, reject) => {
    let settled = false;
    let timeoutId: NodeJS.Timeout | undefined;

    const uploadStream = client.uploader.upload_stream(
      {
        folder: CLOUDINARY_FOLDER,
        resource_type: 'image',
        unique_filename: true,
        use_filename: false,
        overwrite: false,
      },
      (error, result) => {
        if (settled) return;
        settled = true;
        if (timeoutId) clearTimeout(timeoutId);

        if (error) {
          reject(error);
          return;
        }

        if (!result?.secure_url || !result.public_id) {
          reject(new Error('Cloudinary returned an incomplete upload response.'));
          return;
        }

        resolve(result);
      },
    );

    timeoutId = setTimeout(() => {
      if (settled) return;
      settled = true;
      uploadStream.destroy(new Error('Cloudinary upload timed out.'));
      reject(new AppError(504, 'Cloudinary took too long to accept the salary slip. Please try again.', 'FILE_STORAGE_TIMEOUT'));
    }, FILE_STORAGE_TIMEOUT_MS);

    uploadStream.end(file.buffer);
  });
};

export const storeSalarySlip = async (file: Express.Multer.File, _borrowerId: string): Promise<SalarySlipMetadata> => {
  let uploadResult: UploadApiResponse;
  try {
    uploadResult = await uploadToCloudinary(file);
  } catch (error) {
    if (error instanceof AppError) throw error;
    const providerMessage = getSafeProviderErrorMessage(error);
    const providerStatus = (error as { http_code?: unknown }).http_code;
    const failure = getCloudinaryFailure(providerMessage, typeof providerStatus === 'number' ? providerStatus : undefined);
    console.error('[Cloudinary] Salary slip upload failed', { message: providerMessage });
    throw new AppError(
      502,
      env.nodeEnv === 'development' ? `${failure.message} Provider: ${providerMessage}` : failure.message,
      failure.code,
      env.nodeEnv === 'development' ? [{ field: 'storage', message: providerMessage }] : [],
    );
  }

  return {
    url: uploadResult.secure_url,
    publicId: uploadResult.public_id,
    originalName: file.originalname,
    mimeType: file.mimetype,
    sizeBytes: file.size,
  };
};

export const removeStoredFile = async (publicId?: string): Promise<void> => {
  if (!publicId || publicId.startsWith('http')) return;

  try {
    const client = getCloudinaryClient();
    await client.uploader.destroy(publicId, {
      invalidate: true,
      resource_type: 'image',
      type: 'upload',
    });
  } catch {
    // Cleanup is best-effort; the original database error is more useful to the client.
  }
};

const withTimeout = async (request: (signal: AbortSignal) => Promise<Response>): Promise<Response> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FILE_STORAGE_TIMEOUT_MS);

  try {
    return await request(controller.signal);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new AppError(504, 'File storage took too long to respond. Please try again.', 'FILE_STORAGE_TIMEOUT');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

export const fetchStoredFile = async (url: string): Promise<StoredFile> => {
  let fileUrl: URL;
  try {
    fileUrl = new URL(url);
  } catch {
    throw new AppError(502, 'The stored salary slip URL is invalid.', 'FILE_STORAGE_INVALID_URL');
  }

  if (!['http:', 'https:'].includes(fileUrl.protocol)) {
    throw new AppError(502, 'The stored salary slip URL is invalid.', 'FILE_STORAGE_INVALID_URL');
  }

  let response: Response;
  try {
    response = await withTimeout((signal) =>
      fetch(fileUrl, {
        signal,
        redirect: 'follow',
        headers: {
          Accept: 'application/pdf,image/jpeg,image/png,application/octet-stream;q=0.9,*/*;q=0.5',
          'User-Agent': 'CreditSea-LMS-File-Proxy/1.0',
        },
      }),
    );
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(502, 'Unable to connect to file storage. Please try again.', 'FILE_STORAGE_UNAVAILABLE');
  }

  if ([401, 403].includes(response.status)) {
    throw new AppError(
      502,
      'Cloudinary blocked salary-slip delivery. Enable PDF delivery in the Cloudinary Product Environment Security settings and retry.',
      'FILE_STORAGE_DELIVERY_BLOCKED',
    );
  }

  if (!response.ok) {
    throw new AppError(502, 'File storage could not return the salary slip.', 'FILE_STORAGE_FETCH_FAILED');
  }

  const contentType = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
  if (contentType && !ALLOWED_REMOTE_FILE_TYPES.has(contentType)) {
    throw new AppError(502, 'File storage returned an invalid salary slip file.', 'FILE_STORAGE_INVALID_RESPONSE');
  }

  const content = Buffer.from(await response.arrayBuffer());
  if (content.length === 0) {
    throw new AppError(502, 'File storage returned an empty salary slip file.', 'FILE_STORAGE_EMPTY_RESPONSE');
  }

  return {
    content,
    mimeType: contentType === 'application/octet-stream' ? undefined : contentType,
  };
};
