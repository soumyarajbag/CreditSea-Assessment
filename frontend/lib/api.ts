const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api/v1';
const REQUEST_TIMEOUT_MS = 10000;

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

const fetchWithTimeout = async (url: string, options: RequestInit): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, { ...options, credentials: options.credentials ?? 'include', signal: options.signal ?? controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError('The request timed out. Please try again.', 408, 'REQUEST_TIMEOUT');
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

  const response = await fetchWithTimeout(`${API_BASE_URL}${path}`, { ...options, headers, cache: 'no-store' });
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { message?: string; code?: string; errors?: unknown[] };
    throw new ApiError(payload.message ?? 'Unable to load file preview.', response.status, payload.code, payload.errors ?? []);
  }
  return response.blob();
};

export const jsonBody = (body: unknown): RequestInit => ({ body: JSON.stringify(body) });
