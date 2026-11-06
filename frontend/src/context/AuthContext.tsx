import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
  isStaff: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const token = localStorage.getItem('craveables_token');
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }
      try {
        const userData = await api.getCurrentUser();
        setUser(userData);
      } catch (err) {
        console.warn('Authentication session expired or invalid:', err);
        localStorage.removeItem('craveables_token');
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const resp = await api.login({ username, password });
      if (resp.token) {
        localStorage.setItem('craveables_token', resp.token);
      }
      setUser(resp.user);
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('craveables_token');
    setUser(null);
  };

  const isAdmin = user?.role === 'ADMIN' || user?.is_superuser === true;
  const isStaff = user?.role === 'STAFF' || isAdmin;

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin, isStaff }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

