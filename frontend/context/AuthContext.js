import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from '../utils/storage';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    restoreSession();
  }, []);

  const restoreSession = async () => {
    try {
      const token = await SecureStore.getItemAsync('accessToken');
      if (token) {
        const { data } = await authAPI.getMe();
        setUser(data.user);
      }
    } catch {
      // Token expired or invalid — clear storage
      await SecureStore.deleteItemAsync('accessToken');
      await SecureStore.deleteItemAsync('refreshToken');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const { data } = await authAPI.login({ email, password });
    await SecureStore.setItemAsync('accessToken', data.accessToken);
    await SecureStore.setItemAsync('refreshToken', data.refreshToken);
    setUser(data.user);
    return data.user;
  };

  const register = async (name, email, password) => {
    const { data } = await authAPI.register({ name, email, password });
    await SecureStore.setItemAsync('accessToken', data.accessToken);
    await SecureStore.setItemAsync('refreshToken', data.refreshToken);
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    try { await authAPI.logout(); } catch {}
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
