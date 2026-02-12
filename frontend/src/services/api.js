import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

/**
 * Axios instance configured with base URL.
 * This creates a reusable HTTP client for all API calls.
 */
const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Request interceptor - automatically adds JWT token to all requests.
 * This runs before every API call and attaches the token from localStorage.
 */
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

/**
 * Response interceptor - handles common errors.
 * This runs after every API response and can handle auth errors globally.
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const requestUrl = error.config?.url || "";
      const currentPath = window.location.pathname || "";
      const isAuthRequest = requestUrl.includes("/auth") || requestUrl.includes("/login");
      const isLoginPage = currentPath === "/login" || currentPath === "/register";

      if (!isAuthRequest && !isLoginPage) {
        // Token expired or invalid - redirect to login
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export default api;
