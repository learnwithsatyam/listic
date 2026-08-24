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

// --- Studio (cafe food photos on a consistent background) ---
export type StudioFormatSlug = 'square' | 'portrait' | 'story' | 'landscape';

export interface StudioFormat {
  slug: StudioFormatSlug;
  name: string;
  aspect: string;
  width: number;
  height: number;
  description: string;
}

export interface StudioBackground {
  id: string;
  name: string;
  source: 'uploaded' | 'generated';
  prompt?: string;
  imageUrl: string;
  width: number;
  height: number;
  createdAt: string;
}

export interface FoodShot {
  id: string;
  dishName: string;
  sourceImageUrl: string;
  resultImageUrl?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  errorMessage?: string;
  width: number;
  height: number;
}

export interface FoodShoot {
  id: string;
  name: string;
  format: StudioFormatSlug;
  stylePrompt?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  errorMessage?: string;
  background: StudioBackground;
  shots: FoodShot[];
  createdAt: string;
}

export const studioApi = {
  getFormats: () => api.get<StudioFormat[]>('/studio/formats'),

  // Backgrounds
  uploadBackground: (formData: FormData) =>
    api.post<StudioBackground>('/studio/backgrounds/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  generateBackground: (data: { prompt: string; name?: string; format?: string }) =>
    api.post<StudioBackground>('/studio/backgrounds/generate', data),
  getBackgrounds: () => api.get<StudioBackground[]>('/studio/backgrounds'),
  getBackground: (id: string) => api.get<StudioBackground>(`/studio/backgrounds/${id}`),
  deleteBackground: (id: string) => api.delete(`/studio/backgrounds/${id}`),

  // Shoots
  createShoot: (formData: FormData) =>
    api.post<FoodShoot>('/studio/shoots', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  composeShoot: (id: string) => api.post<FoodShoot>(`/studio/shoots/${id}/compose`),
  getShoots: () => api.get<FoodShoot[]>('/studio/shoots'),
  getShoot: (id: string) => api.get<FoodShoot>(`/studio/shoots/${id}`),
};

// --- Platforms ---
export const platformsApi = {
  getAll: () => api.get('/platforms'),
  getBySlug: (slug: string) => api.get(`/platforms/${slug}`),
};

// --- Users ---
export const usersApi = {
  getMe: () => api.get('/users/me'),
};

// --- Payments ---
export const paymentsApi = {
  getTiers: () => api.get('/payments/tiers'),
  createOrder: (tierSlug: string) =>
    api.post<{ orderId: string; amount: number; currency: string; keyId: string }>('/payments/create-order', { tierSlug }),
  verifyPayment: (data: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => api.post<{ success: boolean; credits: number }>('/payments/verify', data),
  getHistory: () =>
    api.get<Array<{
      id: string;
      razorpayOrderId: string;
      razorpayPaymentId: string;
      tierSlug: string;
      tierName: string;
      credits: number;
      amountPaise: number;
      currency: string;
      status: string;
      createdAt: string;
    }>>('/payments/history'),
};
