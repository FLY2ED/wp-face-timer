import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthService } from '@/services/api/auth.service';
import type { UserResponseDto, RegisterDto, LoginDto } from '@/types/api';
import { toast } from 'sonner';

interface AuthState {
  user: UserResponseDto | null;
  isLoading: boolean;
  isHydrated: boolean;
}

interface AuthActions {
  login: (data: LoginDto) => Promise<void>;
  register: (data: RegisterDto) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: (user: UserResponseDto | null) => void;
  setLoading: (loading: boolean) => void;
  setHydrated: (hydrated: boolean) => void;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // State
      user: null,
      isLoading: false,
      isHydrated: false,

      // Actions
      setUser: (user) => set({ user }),
      setLoading: (isLoading) => set({ isLoading }),
      setHydrated: (isHydrated) => set({ isHydrated }),

      login: async (data: LoginDto) => {
        try {
          set({ isLoading: true });
          const response = await AuthService.login(data);

          // Save tokens
          AuthService.saveTokens(response.accessToken, response.refreshToken);

          // Set user
          set({ user: response.user });

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
          set({ isLoading: false });
        }
      },

      register: async (data: RegisterDto) => {
        try {
          set({ isLoading: true });
          const response = await AuthService.register(data);

          // Save tokens
          AuthService.saveTokens(response.accessToken, response.refreshToken);

          // Set user
          set({ user: response.user });

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
          set({ isLoading: false });
        }
      },

      logout: async () => {
        try {
          set({ isLoading: true });

          // Call logout endpoint
          await AuthService.logout();
        } catch (error) {
          console.error('Logout API failed:', error);
        } finally {
          // Always clear local state regardless of API success
          AuthService.clearTokens();
          set({ user: null, isLoading: false });
          toast.success('로그아웃되었습니다.');
        }
      },

      refreshUser: async () => {
        const hasToken = AuthService.isAuthenticated();
        if (!hasToken) {
          set({ user: null });
          return;
        }

        try {
          const currentUser = await AuthService.getCurrentUser();
          set({ user: currentUser });
        } catch (error) {
          console.error('Failed to refresh user:', error);
          AuthService.clearTokens();
          set({ user: null });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user }), // Only persist user
      onRehydrateStorage: () => (state) => {
        // Called when storage is rehydrated
        state?.setHydrated(true);
      },
    }
  )
);

// Selector for isAuthenticated
export const useIsAuthenticated = () => useAuthStore((state) => !!state.user);
