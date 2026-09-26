import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserSettings } from '../types';
import { apiRequest, setAuthTokens, clearAuthTokens, getAuthToken } from '../api/client';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, confirmPassword?: string, timezone?: string) => Promise<void>;
  logout: () => void;
  updateSettings: (settings: Partial<UserSettings>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshProfile = async () => {
    try {
      if (!getAuthToken()) {
        setUser(null);
        setIsLoading(false);
        return;
      }
      const data = await apiRequest<User>('/auth/profile');
      setUser(data);
      localStorage.setItem('applylog_user', JSON.stringify(data));
    } catch {
      setUser(null);
      clearAuthTokens();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('applylog_user');
    if (savedUser && getAuthToken()) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        // ignore parse error
      }
    }
    refreshProfile();
  }, []);

  const login = async (email: string, password: string) => {
    const data = await apiRequest<{ user: User; accessToken: string; refreshToken: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    setAuthTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
    localStorage.setItem('applylog_user', JSON.stringify(data.user));
  };

  const register = async (name: string, email: string, password: string, confirmPassword?: string, timezone?: string) => {
    const data = await apiRequest<{ user: User; accessToken: string; refreshToken: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, confirmPassword, timezone }),
    });

    setAuthTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
    localStorage.setItem('applylog_user', JSON.stringify(data.user));
  };

  const logout = () => {
    clearAuthTokens();
    setUser(null);
    window.location.href = '/login';
  };

  const updateSettings = async (settings: Partial<UserSettings>) => {
    const updated = await apiRequest<UserSettings>('/auth/settings', {
      method: 'PATCH',
      body: JSON.stringify(settings),
    });

    if (user) {
      const newUser = { ...user, settings: updated };
      setUser(newUser);
      localStorage.setItem('applylog_user', JSON.stringify(newUser));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        logout,
        updateSettings,
        refreshProfile,
      }}
    >
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
