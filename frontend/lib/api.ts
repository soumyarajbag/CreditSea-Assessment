const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api/v1';
const REQUEST_TIMEOUT_MS = 10000;
const FILE_REQUEST_TIMEOUT_MS = 30000;

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly errors: unknown[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const fetchWithTimeout = async (url: string, options: RequestInit, timeoutMs = REQUEST_TIMEOUT_MS): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, credentials: options.credentials ?? 'include', signal: options.signal ?? controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError('The request timed out. Please try again.', 408, 'REQUEST_TIMEOUT');
    }
    if (error instanceof TypeError) {
      throw new ApiError('Unable to reach the API. Check the backend URL and local CORS configuration.', 0, 'NETWORK_ERROR');
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
};

export const apiFetch = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetchWithTimeout(`${API_BASE_URL}${path}`, { ...options, headers, cache: 'no-store' });
  const payload = (await response.json().catch(() => ({}))) as {
    message?: string;
    code?: string;
    errors?: unknown[];
  } & T;

  if (!response.ok) {
    throw new ApiError(payload.message ?? 'Request failed.', response.status, payload.code, payload.errors ?? []);
  }
  return payload as T;
};

export const apiFetchBlob = async (path: string, options: RequestInit = {}): Promise<Blob> => {
  const headers = new Headers(options.headers);

  const response = await fetchWithTimeout(`${API_BASE_URL}${path}`, { ...options, headers, cache: 'no-store' }, FILE_REQUEST_TIMEOUT_MS);
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { message?: string; code?: string; errors?: unknown[] };
    throw new ApiError(payload.message ?? 'Unable to load file preview.', response.status, payload.code, payload.errors ?? []);
  }
  return response.blob();
};

export const jsonBody = (body: unknown): RequestInit => ({ body: JSON.stringify(body) });
