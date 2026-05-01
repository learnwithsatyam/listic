import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (
      (err.response?.status === 401 || err.response?.status === 403) &&
      !err.config?.url?.includes('/auth/login') &&
      !err.config?._skipAuthRedirect
    ) {
      localStorage.removeItem('admin_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

// Auth
export const login = (email: string, password: string) =>
  api.post('/auth/login', { email, password });

// Dashboard
export const getDashboard = () => api.get('/admin/dashboard');
export const verifyAdminAccess = () =>
  api.get('/admin/dashboard', { _skipAuthRedirect: true } as any);
export const getRecentActivity = (limit = 20) =>
  api.get('/admin/activity', { params: { limit } });

// Revenue
export const getRevenue = (year?: number, month?: number) =>
  api.get('/admin/revenue', { params: { year, month } });
export const getMonthlyRevenue = (year?: number) =>
  api.get('/admin/revenue/monthly', { params: { year } });

// Users
export const getUsers = (page = 1, limit = 20, search?: string) =>
  api.get('/admin/users', { params: { page, limit, search } });
export const getUserDetail = (id: string) => api.get(`/admin/users/${id}`);
export const updateUserCredits = (id: string, credits: number) =>
  api.patch(`/admin/users/${id}/credits`, { credits });
export const toggleUserAdmin = (id: string, isAdmin: boolean) =>
  api.patch(`/admin/users/${id}/admin`, { isAdmin });

export default api;
