import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { AuthService } from '@/services/api/auth.service';
import type { UserResponseDto, RegisterDto, LoginDto } from '@/types/api';

interface AuthContextType {
  user: UserResponseDto | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginDto) => Promise<void>;
  register: (data: RegisterDto) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const {
    user,
    isLoading,
    isHydrated,
    login,
    register,
    logout,
    refreshUser,
    setLoading,
  } = useAuthStore();

  // Verify token validity on mount (after hydration)
  useEffect(() => {
    if (!isHydrated) return;

    const verifyAuth = async () => {
      const hasToken = AuthService.isAuthenticated();

      if (hasToken && user) {
        // User exists in store, verify token is still valid
        try {
          setLoading(true);
          await refreshUser();
        } catch (error) {
          console.error('Token verification failed:', error);
        } finally {
          setLoading(false);
        }
      } else if (hasToken && !user) {
        // Token exists but no user in store, fetch user
        try {
          setLoading(true);
          await refreshUser();
        } catch (error) {
          console.error('Failed to fetch user:', error);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    verifyAuth();
  }, [isHydrated]);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading: !isHydrated || isLoading,
    login,
    register,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
