import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { TaskService } from '@/services/api/task.service';
import type { TaskResponseDto, CreateTaskDto, UpdateTaskDto } from '@/types/api';
import type { Task } from '@/types';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';
import { defaultTasks } from '@/data/mockData';

interface TaskContextType {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  fetchTasks: () => Promise<void>;
  createTask: (data: CreateTaskDto) => Promise<Task | null>;
  updateTask: (id: string, data: UpdateTaskDto) => Promise<Task | null>;
  deleteTask: (id: string) => Promise<boolean>;
  toggleTask: (id: string) => Promise<Task | null>;
  getTaskById: (id: string) => Task | undefined;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export const useTask = () => {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTask must be used within a TaskProvider');
  }
  return context;
};

interface TaskProviderProps {
  children: ReactNode;
}

// 백엔드 응답을 프론트엔드 Task 타입으로 변환
const transformTaskResponse = (task: TaskResponseDto): Task => ({
  id: task.id,
  title: task.title,
  icon: task.icon,
  color: task.color,
  isActive: task.isActive,
  totalTime: task.totalTime * 1000, // 초 -> 밀리초
  requiresAuth: true,
});

export const TaskProvider: React.FC<TaskProviderProps> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 태스크 목록 조회
  const fetchTasks = useCallback(async () => {
    if (!isAuthenticated) {
      // 비로그인 시 기본 태스크 사용
      setTasks(defaultTasks);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const response = await TaskService.getAll();
      const transformedTasks = response.map(transformTaskResponse);

      // 백엔드 태스크가 없으면 기본 태스크도 함께 표시
      if (transformedTasks.length === 0) {
        setTasks(defaultTasks);
      } else {
        setTasks(transformedTasks);
      }
    } catch (err: any) {
      console.error('Failed to fetch tasks:', err);
      setError('태스크를 불러오는데 실패했습니다.');
      // 에러 시 기본 태스크 표시
      setTasks(defaultTasks);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // 인증 상태 변경 시 태스크 다시 로드
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // 태스크 생성
  const createTask = async (data: CreateTaskDto): Promise<Task | null> => {
    if (!isAuthenticated) {
      toast.error('로그인이 필요합니다.');
      return null;
    }

    try {
      setIsLoading(true);
      const response = await TaskService.create(data);
      const newTask = transformTaskResponse(response);

      setTasks(prev => [newTask, ...prev]);
      toast.success('태스크가 생성되었습니다.');

      return newTask;
    } catch (err: any) {
      console.error('Failed to create task:', err);
      const errorMessage = err.response?.data?.message || '태스크 생성에 실패했습니다.';
      toast.error(Array.isArray(errorMessage) ? errorMessage[0] : errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // 태스크 수정
  const updateTask = async (id: string, data: UpdateTaskDto): Promise<Task | null> => {
    if (!isAuthenticated) {
      toast.error('로그인이 필요합니다.');
      return null;
    }

    try {
      setIsLoading(true);
      const response = await TaskService.update(id, data);
      const updatedTask = transformTaskResponse(response);

      setTasks(prev => prev.map(t => t.id === id ? updatedTask : t));
      toast.success('태스크가 수정되었습니다.');

      return updatedTask;
    } catch (err: any) {
      console.error('Failed to update task:', err);
      const errorMessage = err.response?.data?.message || '태스크 수정에 실패했습니다.';
      toast.error(Array.isArray(errorMessage) ? errorMessage[0] : errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // 태스크 삭제
  const deleteTask = async (id: string): Promise<boolean> => {
    if (!isAuthenticated) {
      toast.error('로그인이 필요합니다.');
      return false;
    }

    try {
      setIsLoading(true);
      await TaskService.delete(id);

      setTasks(prev => prev.filter(t => t.id !== id));
      toast.success('태스크가 삭제되었습니다.');

      return true;
    } catch (err: any) {
      console.error('Failed to delete task:', err);
      const errorMessage = err.response?.data?.message || '태스크 삭제에 실패했습니다.';
      toast.error(Array.isArray(errorMessage) ? errorMessage[0] : errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // 태스크 토글
  const toggleTask = async (id: string): Promise<Task | null> => {
    if (!isAuthenticated) {
      toast.error('로그인이 필요합니다.');
      return null;
    }

    try {
      setIsLoading(true);
      const response = await TaskService.toggle(id);
      const updatedTask = transformTaskResponse(response);

      setTasks(prev => prev.map(t => t.id === id ? updatedTask : t));

      return updatedTask;
    } catch (err: any) {
      console.error('Failed to toggle task:', err);
      const errorMessage = err.response?.data?.message || '태스크 상태 변경에 실패했습니다.';
      toast.error(Array.isArray(errorMessage) ? errorMessage[0] : errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // ID로 태스크 찾기
  const getTaskById = (id: string): Task | undefined => {
    return tasks.find(t => t.id === id);
  };

  const value: TaskContextType = {
    tasks,
    isLoading,
    error,
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    toggleTask,
    getTaskById,
  };

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
};
