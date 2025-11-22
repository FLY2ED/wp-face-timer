import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthService } from '@/services/api/auth.service';
import type { UserResponseDto, RegisterDto, LoginDto } from '@/types/api';
import { toast } from 'sonner';

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
  const [user, setUser] = useState<UserResponseDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state on mount
  useEffect(() => {
    const initializeAuth = async () => {
      const isAuth = AuthService.isAuthenticated();

      if (isAuth) {
        try {
          // Try to fetch current user
          const currentUser = await AuthService.getCurrentUser();
          setUser(currentUser);
        } catch (error) {
          console.error('Failed to fetch current user:', error);
          // Token might be invalid, clear tokens
          AuthService.clearTokens();
          setUser(null);
        }
      }

      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (data: LoginDto) => {
    try {
      setIsLoading(true);
      const response = await AuthService.login(data);

      // Save tokens
      AuthService.saveTokens(response.accessToken, response.refreshToken);

      // Set user
      setUser(response.user);

      toast.success('로그인 성공!', {
        description: `환영합니다, ${response.user.name}님!`,
      });
    } catch (error: any) {
      console.error('Login failed:', error);

      const errorMessage = error.response?.data?.message || '로그인에 실패했습니다.';
      toast.error('로그인 실패', {
        description: Array.isArray(errorMessage) ? errorMessage[0] : errorMessage,
      });

      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterDto) => {
    try {
      setIsLoading(true);
      const response = await AuthService.register(data);

      // Save tokens
      AuthService.saveTokens(response.accessToken, response.refreshToken);

      // Set user
      setUser(response.user);

      toast.success('회원가입 성공!', {
        description: `환영합니다, ${response.user.name}님!`,
      });
    } catch (error: any) {
      console.error('Registration failed:', error);

      const errorMessage = error.response?.data?.message || '회원가입에 실패했습니다.';
      toast.error('회원가입 실패', {
        description: Array.isArray(errorMessage) ? errorMessage[0] : errorMessage,
      });

      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);

      // Call logout endpoint
      await AuthService.logout();

      // Clear tokens
      AuthService.clearTokens();

      // Clear user
      setUser(null);

      toast.success('로그아웃되었습니다.');
    } catch (error) {
      console.error('Logout failed:', error);

      // Even if logout fails, clear local state
      AuthService.clearTokens();
      setUser(null);

      toast.error('로그아웃 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    try {
      const currentUser = await AuthService.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Failed to refresh user:', error);
      AuthService.clearTokens();
      setUser(null);
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
