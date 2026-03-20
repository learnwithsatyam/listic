import axios, { InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../stores/auth-store';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120_000, // 2 min for image generation
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  },
);

// --- Auth ---
export const authApi = {
  register: (data: { email: string; password: string; name: string }) =>
    api.post<{ accessToken: string; userId: string }>('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post<{ accessToken: string; userId: string }>('/auth/login', data),
};

// --- Images ---
export const imagesApi = {
  createProject: (formData: FormData) =>
    api.post('/images/projects', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  generateImages: (projectId: string, additionalPrompt?: string) =>
    api.post('/images/generate', { projectId, additionalPrompt }),
  getProject: (projectId: string) => api.get(`/images/projects/${projectId}`),
  getUserProjects: () => api.get('/images/projects'),
};

// --- Platforms ---
export const platformsApi = {
  getAll: () => api.get('/platforms'),
  getBySlug: (slug: string) => api.get(`/platforms/${slug}`),
};
