import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, phone: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  googleLogin: (credential: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateUserInState: (updated: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('selection_user');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('selection_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('selection_user');
    }
  }, [user]);

  const login = async (email: string, pass: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass })
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error_ar || data.error };
      }
      setUser(data.user);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: 'حدث خطأ بالاتصال بالنظام' };
    }
  };

  const register = async (name: string, email: string, phone: string, pass: string) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, password: pass })
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error_ar || data.error };
      }
      setUser(data.user);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: 'حدث خطأ عند تسجيل الحساب' };
    }
  };

  const googleLogin = useCallback(async (credential: string) => {
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential })
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error_ar || data.error };
      }
      setUser(data.user);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: 'حدث خطأ في تسجيل الدخول بجوجل' };
    }
  }, []);

  const logout = () => {
    setUser(null);
  };

  const updateUserInState = (updated: User) => {
    setUser(updated);
  };

  return (
    <AuthContext.Provider value={{ user, isAdmin: user?.role === 'admin', login, register, googleLogin, logout, updateUserInState }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
