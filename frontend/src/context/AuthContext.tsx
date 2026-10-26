import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, TokenResponse } from '../types/auth';
import { authApi } from '../api/client';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<TokenResponse>;
  register: (fullName: string, email: string, password: string) => Promise<TokenResponse>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'docuquality_token';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load user profile on startup if token exists
  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      if (!storedToken) {
        if (isMounted) {
          setIsLoading(false);
          setUser(null);
          setToken(null);
        }
        return;
      }

      try {
        const currentUser = await authApi.getMe();
        if (isMounted) {
          setUser(currentUser);
          setToken(storedToken);
        }
      } catch (err) {
        console.warn('Session expired or invalid token:', err);
        localStorage.removeItem(TOKEN_KEY);
        if (isMounted) {
          setUser(null);
          setToken(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<TokenResponse> => {
    const res = await authApi.login({ email, password });
    localStorage.setItem(TOKEN_KEY, res.access_token);
    setToken(res.access_token);
    setUser(res.user);
    return res;
  }, []);

  const register = useCallback(
    async (fullName: string, email: string, password: string): Promise<TokenResponse> => {
      const res = await authApi.register({ full_name: fullName, email, password });
      localStorage.setItem(TOKEN_KEY, res.access_token);
      setToken(res.access_token);
      setUser(res.user);
      return res;
    },
    []
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    isLoading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
