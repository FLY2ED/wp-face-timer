import apiClient from './client';
import type {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  AuthResponseDto,
  RefreshResponseDto,
  UserResponseDto,
} from '../../types/api';

export class AuthService {
  /**
   * Register a new user
   */
  static async register(data: RegisterDto): Promise<AuthResponseDto> {
    const response = await apiClient.post<AuthResponseDto>('/auth/register', data);
    return response.data;
  }

  /**
   * Login user
   */
  static async login(data: LoginDto): Promise<AuthResponseDto> {
    const response = await apiClient.post<AuthResponseDto>('/auth/login', data);
    return response.data;
  }

  /**
   * Refresh access token
   */
  static async refresh(data: RefreshTokenDto): Promise<RefreshResponseDto> {
    const response = await apiClient.post<RefreshResponseDto>('/auth/refresh', data);
    return response.data;
  }

  /**
   * Logout user
   */
  static async logout(): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>('/auth/logout');
    return response.data;
  }

  /**
   * Get current user profile
   */
  static async getCurrentUser(): Promise<UserResponseDto> {
    const response = await apiClient.get<UserResponseDto>('/auth/me');
    return response.data;
  }

  /**
   * Save tokens to localStorage
   */
  static saveTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
  }

  /**
   * Clear tokens from localStorage
   */
  static clearTokens(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated(): boolean {
    const accessToken = localStorage.getItem('access_token');
    return !!accessToken;
  }

  /**
   * Get access token
   */
  static getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  }

  /**
   * Get refresh token
   */
  static getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }
}
