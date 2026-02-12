import api from "./api.js";

/**
 * Register a new user.
 */
export const register = async (email, password, name, role) => {
  const response = await api.post("/auth/register", {
    email,
    password,
    name,
    role,
  });
  return response.data;
};

/**
 * Login user and get token.
 */
export const login = async (email, password) => {
  const response = await api.post("/auth/login", { email, password });
  return response.data;
};

/**
 * Get current user profile.
 */
export const getMe = async () => {
  const response = await api.get("/auth/me");
  return response.data;
};
