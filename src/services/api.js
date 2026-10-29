import axios from 'axios';

const api = axios.create({
  baseURL: (typeof import.meta !== 'undefined' && import.meta?.env?.VITE_API_URL) || '',
  headers: {
    'Content-Type': 'text/plain', // Use text/plain to avoid preflight CORS OPTIONS requests
  },
});

export default api;
