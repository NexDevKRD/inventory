import axios, { AxiosInstance } from 'axios';

export function createApiClient(getAccessToken: () => string | null, onRefreshFailed?: () => void): AxiosInstance {
  const client = axios.create({ baseURL: '/api/v1', withCredentials: true });

  client.interceptors.request.use((config) => {
    const token = getAccessToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  let refreshing: Promise<string> | null = null;

  client.interceptors.response.use(
    (res) => res,
    async (error) => {
      const original = error.config;
      if (error.response?.status === 401 && !original._retry) {
        original._retry = true;
        try {
          refreshing ??= axios.post('/api/v1/auth/refresh', {}, { withCredentials: true }).then((r) => r.data.data.accessToken);
          const newToken = await refreshing;
          refreshing = null;
          original.headers.Authorization = `Bearer ${newToken}`;
          return client(original);
        } catch {
          refreshing = null;
          onRefreshFailed?.();
        }
      }
      return Promise.reject(error);
    }
  );

  return client;
}
