import axios from 'axios';
import * as SecureStore from '../utils/storage';

// EXPO_PUBLIC_ prefix is required for Expo to expose env vars to the client
// Android emulator default: http://10.0.2.2:5000/api
// Expo Go on phone: http://YOUR_LOCAL_IP:5000/api
// Deployed: https://YOUR-RENDER-URL.onrender.com/api
const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://10.0.2.2:5000/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach access token to every request
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let refreshSubscribers = [];

const onRefreshed = (token) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

const addSubscriber = (cb) => {
  refreshSubscribers.push(cb);
};

// Auto-refresh token on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve) => {
          addSubscriber((token) => {
            original.headers.Authorization = `Bearer ${token}`;
            resolve(api(original));
          });
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await SecureStore.getItemAsync('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');
        
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
        await SecureStore.setItemAsync('accessToken', data.accessToken);
        await SecureStore.setItemAsync('refreshToken', data.refreshToken);
        
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        isRefreshing = false;
        onRefreshed(data.accessToken);
        
        return api(original);
      } catch (err) {
        isRefreshing = false;
        await SecureStore.deleteItemAsync('accessToken');
        await SecureStore.deleteItemAsync('refreshToken');
        return Promise.reject(err);
      }
    }
    return Promise.reject(error);
  }
);

// --- Auth ---
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  getUsers: () => api.get('/auth/users'),
  createStaff: (data) => api.post('/auth/users', data),
  updateUser: (id, data) => api.put(`/auth/users/${id}`, data),
};

// --- Branches ---
export const branchAPI = {
  getAll: (params) => api.get('/branches', { params }),
  getById: (id) => api.get(`/branches/${id}`),
  create: (data) => api.post('/branches', data),
  update: (id, data) => api.put(`/branches/${id}`, data),
  delete: (id) => api.delete(`/branches/${id}`),
  restore: (id) => api.post(`/branches/${id}/restore`),
};

// --- Halls ---
export const hallAPI = {
  getAll: (params) => api.get('/halls', { params }),
  getById: (id) => api.get(`/halls/${id}`),
  create: (data) => api.post('/halls', data),
  update: (id, data) => api.put(`/halls/${id}`, data),
  delete: (id) => api.delete(`/halls/${id}`),
};

// --- Movies ---
export const movieAPI = {
  getAll: (params) => api.get('/movies', { params }),
  getById: (id) => api.get(`/movies/${id}`),
  create: (data) => api.post('/movies', data),
  update: (id, data) => api.put(`/movies/${id}`, data),
  delete: (id) => api.delete(`/movies/${id}`),
  uploadPoster: (id, formData) =>
    api.post(`/movies/${id}/poster`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getDistinctActors: () => api.get('/movies/actors/distinct'),
  uploadActorImage: (formData) =>
    api.post('/movies/upload-image', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

// --- Time Slots ---
export const slotAPI = {
  getAll: (params) => api.get('/timeslots', { params }),
  getById: (id) => api.get(`/timeslots/${id}`),
  getSeats: (id) => api.get(`/timeslots/${id}/seats`),
  create: (data) => api.post('/timeslots', data),
  update: (id, data) => api.put(`/timeslots/${id}`, data),
  delete: (id) => api.delete(`/timeslots/${id}`),
};

// --- Seats & Bookings ---
export const bookingAPI = {
  lockSeats: (data) => api.post('/seats/lock', data),
  releaseSeats: (data) => api.delete('/seats/lock', { data }),
  processPayment: (data) => api.post('/payments/process', data),
  getMyBookings: () => api.get('/bookings/my'),
  cancelBooking: (id) => api.put(`/bookings/${id}/cancel`),
  deleteBooking: (id) => api.delete(`/bookings/${id}`),
  getMyTickets: () => api.get('/tickets/my'),
  getTicketByCode: (code) => api.get(`/tickets/${code}`),
  validateTicket: (code) => api.post(`/tickets/${code}/validate`),
};

// --- Reviews ---
export const reviewAPI = {
  getAll: (params) => api.get('/reviews', { params }),
  getStats: (movieId) => api.get(`/reviews/stats/${movieId}`),
  create: (data) => api.post('/reviews', data),
  update: (id, data) => api.put(`/reviews/${id}`, data),
  moderate: (id, data) => api.put(`/reviews/${id}/moderate`, data),
  delete: (id) => api.delete(`/reviews/${id}`),
};

export default api;
