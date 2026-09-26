const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

export class ApiError extends Error {
  statusCode: number;
  errors?: Record<string, string[]>;

  constructor(message: string, statusCode: number, errors?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

export const getAuthToken = (): string | null => {
  return localStorage.getItem('applylog_access_token');
};

export const getRefreshToken = (): string | null => {
  return localStorage.getItem('applylog_refresh_token');
};

export const setAuthTokens = (access: string, refresh: string) => {
  localStorage.setItem('applylog_access_token', access);
  localStorage.setItem('applylog_refresh_token', refresh);
};

export const clearAuthTokens = () => {
  localStorage.removeItem('applylog_access_token');
  localStorage.removeItem('applylog_refresh_token');
  localStorage.removeItem('applylog_user');
};

export const apiRequest = async <T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    ...(token && { Authorization: `Bearer ${token}` }),
    ...((options.headers as Record<string, string>) || {}),
  };

  // Don't set Content-Type for FormData
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  let response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle Token Expiry & Automatic Refresh
  if (response.status === 401 && getRefreshToken()) {
    try {
      const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: getRefreshToken() }),
      });
      const refreshJson = await refreshRes.json();
      if (refreshJson.success && refreshJson.data) {
        setAuthTokens(refreshJson.data.accessToken, refreshJson.data.refreshToken);
        // Retry original request with new token
        headers['Authorization'] = `Bearer ${refreshJson.data.accessToken}`;
        response = await fetch(url, { ...options, headers });
      } else {
        clearAuthTokens();
        window.location.href = '/login';
      }
    } catch {
      clearAuthTokens();
      window.location.href = '/login';
    }
  }

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new ApiError(
      data.error || data.message || 'An unexpected error occurred',
      response.status,
      data.errors
    );
  }

  return data.data !== undefined ? data.data : data;
};
