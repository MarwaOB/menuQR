import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, restaurantAPI } from '../utils/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('authToken'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on app start
    const initAuth = async () => {
      const storedToken = localStorage.getItem('authToken');
      if (storedToken) {
        try {
          // Set token first so API utility can use it
          setToken(storedToken);
          
          // Verify token is still valid by making a test request
          const userData = await restaurantAPI.getProfile();
          setUser(userData);
        } catch (error) {
          console.error('Auth initialization error:', error);
          // Token is invalid, remove it
          localStorage.removeItem('authToken');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const data = await authAPI.login(email, password);

      // Store token and user data
      localStorage.setItem('authToken', data.token);
      setToken(data.token);
      setUser(data.restaurant);

      return { success: true, data };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  };

  const register = async (restaurantData) => {
    try {
      const data = await authAPI.register(restaurantData);

      return { success: true, data };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    setToken(null);
    setUser(null);
  };

  const forgotPassword = async (email) => {
    try {
      const data = await authAPI.forgotPassword(email);

      return { success: true, data };
    } catch (error) {
      console.error('Forgot password error:', error);
      return { success: false, error: error.message };
    }
  };

  const resetPassword = async (token, newPassword) => {
    try {
      const data = await authAPI.resetPassword(token, newPassword);

      return { success: true, data };
    } catch (error) {
      console.error('Reset password error:', error);
      return { success: false, error: error.message };
    }
  };

  const updateUser = (userData) => {
    setUser(userData);
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
    updateUser,
    isAuthenticated: !!token && !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
