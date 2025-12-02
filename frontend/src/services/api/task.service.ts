import apiClient from './client';
import type {
  CreateTaskDto,
  UpdateTaskDto,
  TaskResponseDto,
} from '../../types/api';

export interface TaskStats {
  total: number;
  active: number;
  inactive: number;
  totalTime: number;
}

export class TaskService {
  /**
   * 새 태스크 생성
   */
  static async create(data: CreateTaskDto): Promise<TaskResponseDto> {
    const response = await apiClient.post<TaskResponseDto>('/tasks', data);
    return response.data;
  }

  /**
   * 모든 태스크 조회
   */
  static async getAll(): Promise<TaskResponseDto[]> {
    const response = await apiClient.get<TaskResponseDto[]>('/tasks');
    return response.data;
  }

  /**
   * 활성 태스크만 조회
   */
  static async getActive(): Promise<TaskResponseDto[]> {
    const response = await apiClient.get<TaskResponseDto[]>('/tasks/active');
    return response.data;
  }

  /**
   * 태스크 통계 조회
   */
  static async getStats(): Promise<TaskStats> {
    const response = await apiClient.get<TaskStats>('/tasks/stats');
    return response.data;
  }

  /**
   * 특정 태스크 조회
   */
  static async getById(id: string): Promise<TaskResponseDto> {
    const response = await apiClient.get<TaskResponseDto>(`/tasks/${id}`);
    return response.data;
  }

  /**
   * 태스크 수정
   */
  static async update(id: string, data: UpdateTaskDto): Promise<TaskResponseDto> {
    const response = await apiClient.patch<TaskResponseDto>(`/tasks/${id}`, data);
    return response.data;
  }

  /**
   * 태스크 활성/비활성 토글
   */
  static async toggle(id: string): Promise<TaskResponseDto> {
    const response = await apiClient.patch<TaskResponseDto>(`/tasks/${id}/toggle`);
    return response.data;
  }

  /**
   * 태스크 삭제
   */
  static async delete(id: string): Promise<void> {
    await apiClient.delete(`/tasks/${id}`);
  }
}
