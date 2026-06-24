import axios from 'axios';
import toast from 'react-hot-toast';
import config from '../config';

const API_BASE_URL = config.apiBaseUrl;

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    
    const message = error.response?.data?.message || error.message || 'An error occurred';
    toast.error(message);
    
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  customerLogin: (credentials) => api.post('/auth/customer-login', credentials),
  signup: (userData) => api.post('/auth/signup', userData),
  adminResetPassword: (data) => api.post('/auth/admin/reset-password', data),
};

// Receipts API
export const receiptsAPI = {
  getReceipts: (params) => api.get('/receipts', { params }),
  getReceipt: (id) => api.get(`/receipts/${id}`),
  createReceipt: (data) => api.post('/receipts', data),
  createReceiptWithFiles: (formData) => api.post('/receipts/with-files', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  testFormData: (formData) => api.post('/receipts/test-form', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  updateReceipt: (id, data) => api.put(`/receipts/${id}`, data),
  deleteReceipt: (id) => api.delete(`/receipts/${id}`),
  uploadFilesToReceipt: (id, formData) => api.post(`/receipts/${id}/upload-files`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  deleteFileFromReceipt: (id, fileIndex) => api.delete(`/receipts/${id}/files/${fileIndex}`),
  downloadFile: (fileUrl) => api.get('/receipts/download-file', {
    params: { fileUrl },
    responseType: 'blob',
  }),
  approveReceipt: (id, data) => api.post(`/receipts/${id}/approve`, data),
  rejectReceipt: (id, data) => api.post(`/receipts/${id}/reject`, data),
  searchReceipts: (searchTerm) => api.get(`/receipts/search?searchTerm=${searchTerm}`),
  getExpiringTokens: (days) => api.get(`/receipts/expiring-tokens?days=${days}`),
  getTodaysExpiringTokens: () => api.get('/receipts/todays-expiring-tokens'),
  getExpiredTokens: () => api.get('/receipts/expired-tokens'),
  getConvertedTokens: () => api.get('/receipts/converted-tokens'),
  processExpiredTokens: () => api.post('/receipts/process-expired-tokens'),
  getCustomerReceipts: () => api.get('/receipts/customer'),
  getReceiptsByPlot: (plotId) => api.get(`/receipts/plot/${plotId}`),
};

// Plots API
export const plotsAPI = {
  getPlots: (params) => api.get('/plots', { params }),
  getPlot: (id) => api.get(`/plots/${id}`),
  createPlot: (data) => api.post('/plots', data),
  bulkCreatePlots: (data) => api.post('/plots/bulk', data),
  updatePlot: (id, data) => api.put(`/plots/${id}`, data),
  deletePlot: (id) => api.delete(`/plots/${id}`),
  getAvailablePlots: (params) => api.get('/plots/available', { params }),
  getExpiredTokenPlots: (params) => api.get('/plots/expired-tokens', { params }),
  getExpiredTokensDashboard: () => api.get('/plots/dashboard/expired-tokens'),
  updatePlotStatus: (id, status) => api.patch(`/plots/${id}/status`, { status }),
  getAssociatePlots: () => api.get('/plots/associate-plots'),
};

// Users API
export const usersAPI = {
  getUsers: () => api.get('/users'),
  getUser: (id) => api.get(`/users/${id}`),
  createUser: (data) => api.post('/users', data),
  updateUser: (id, data) => api.put(`/users/${id}`, data),
  deleteUser: (id) => api.delete(`/users/${id}`),
};

// Customer Api
export const customerAPI = {
  getCustomers: () => api.get('/customer'),
  createCustomer: (data) => api.post('/customer', data),
  deleteCustomer: (id) => api.delete(`/customer/${id}`),
}
// Payments API
export const paymentsAPI = {
  getPayments: (params) => api.get('/payments', { params }),
  getPayment: (id) => api.get(`/payments/${id}`),
  createPayment: (data) => api.post('/payments', data),
  getPaymentSummary: (params) => api.get('/payments/summary', { params }),
};

// Dashboard API
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
  getRevenueByMonth: () => api.get('/dashboard/revenue-by-month'),
  getSiteWiseStats: (params) => api.get('/dashboard/site-wise-stats', { params }),
  getAssociatePerformance: (params) => api.get('/dashboard/associate-performance', { params }),
  getPaymentMethodStats: (params) => api.get('/dashboard/payment-method-stats', { params }),
};

export default api;