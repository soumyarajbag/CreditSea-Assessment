import { env } from '../config/env';
import { SalarySlipMetadata } from '../types';

import { AppError } from '../utils/app-error';

const IMGBB_UPLOAD_URL = 'https://api.imgbb.com/1/upload';
const IMGBB_TIMEOUT_MS = 30_000;

interface ImgBBResponse {
  success?: boolean;
  data?: {
    url?: string;
    display_url?: string;
    delete_url?: string;
    image?: { url?: string };
  };
}

const withTimeout = async (request: (signal: AbortSignal) => Promise<Response>): Promise<Response> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), IMGBB_TIMEOUT_MS);

  try {
    return await request(controller.signal);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new AppError(504, 'Image hosting took too long to respond. Please try again.', 'FILE_STORAGE_TIMEOUT');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

export const storeSalarySlip = async (file: Express.Multer.File, _borrowerId: string): Promise<SalarySlipMetadata> => {
  if (!env.imgbbApiKey) {
    throw new AppError(503, 'Image hosting is not configured. Add IMGBB_API_KEY to the backend environment.', 'IMGBB_NOT_CONFIGURED');
  }

  const formData = new FormData();
  const fileBytes = new Uint8Array(new ArrayBuffer(file.buffer.byteLength));
  fileBytes.set(file.buffer);
  formData.append('image', new Blob([fileBytes.buffer], { type: file.mimetype }), file.originalname);

  let response: Response;
  try {
    response = await withTimeout((signal) =>
      fetch(`${IMGBB_UPLOAD_URL}?key=${encodeURIComponent(env.imgbbApiKey)}`, {
        method: 'POST',
        body: formData,
        signal,
      }),
    );
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(502, 'Unable to connect to image hosting. Please try again.', 'FILE_STORAGE_UNAVAILABLE');
  }

  const payload = (await response.json().catch(() => null)) as ImgBBResponse | null;
  const hostedUrl = payload?.data?.image?.url ?? payload?.data?.url ?? payload?.data?.display_url;
  if (!response.ok || !payload?.success || !hostedUrl) {
    throw new AppError(502, 'Salary slip could not be uploaded to image hosting.', 'FILE_STORAGE_UPLOAD_FAILED');
  }

  return {
    url: hostedUrl,
    deleteUrl: payload.data?.delete_url,
    originalName: file.originalname,
    mimeType: file.mimetype,
    sizeBytes: file.size,
  };
};

export const removeStoredFile = async (deleteUrl?: string): Promise<void> => {
  if (!deleteUrl) return;
  try {
    await fetch(deleteUrl);
  } catch {
    // Cleanup is best-effort; the original database error is more useful to the client.
  }
};

export const fetchStoredFile = async (url: string): Promise<Buffer> => {
  let response: Response;
  try {
    response = await withTimeout((signal) => fetch(url, { signal }));
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(502, 'Unable to connect to image hosting. Please try again.', 'FILE_STORAGE_UNAVAILABLE');
  }

  if (!response.ok) {
    throw new AppError(404, 'Salary slip preview is unavailable.', 'SALARY_SLIP_NOT_FOUND');
  }

  return Buffer.from(await response.arrayBuffer());
};
