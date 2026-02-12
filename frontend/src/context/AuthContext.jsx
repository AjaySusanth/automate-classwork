import { createContext, useContext, useState, useEffect } from "react";
import {
  login as loginApi,
  register as registerApi,
  getMe,
} from "../services/authService";

/**
 * AuthContext provides authentication state and functions to the entire app.
 * This is a centralized place to manage user login status and user data.
 */
const AuthContext = createContext(null);

const getStoredUser = () => {
  try {
    const rawUser = localStorage.getItem("user");
    return rawUser ? JSON.parse(rawUser) : null;
  } catch (error) {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(getStoredUser());
  const [loading, setLoading] = useState(true);

  /**
   * On app load, check if there's a token and fetch user data.
   */
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const data = await getMe();
          setUser(data.user);
        } catch (error) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setUser(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  /**
   * Login function - calls API and stores token + user.
   */
  const login = async (email, password) => {
    const data = await loginApi(email, password);
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    setUser(data.user);
    return data;
  };

  /**
   * Register function - creates account then logs in.
   */
  const register = async (email, password, name, role) => {
    await registerApi(email, password, name, role);
    // After registration, log them in
    return login(email, password);
  };

  /**
   * Logout function - clears token and user data.
   */
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  /**
   * Helper to check if user is authenticated.
   */
  const isAuthenticated = () => !!user;

  /**
   * Helper to check user role.
   */
  const isTeacher = () => user?.role === "TEACHER";
  const isStudent = () => user?.role === "STUDENT";

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated,
    isTeacher,
    isStudent,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Custom hook to use auth context.
 * Usage: const { user, login, logout } = useAuth();
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
