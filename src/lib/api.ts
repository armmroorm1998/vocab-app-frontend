import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const uid = typeof window !== 'undefined' ? localStorage.getItem('uid') : null;
  if (uid) {
    config.headers['x-uid'] = uid;
  }
  return config;
});

export default api;
