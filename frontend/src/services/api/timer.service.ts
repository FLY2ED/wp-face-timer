import apiClient from './client';

// 백엔드 SessionStatus enum과 동일
export enum SessionStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export interface StartTimerRequest {
  taskId?: string;
}

export interface StopTimerRequest {
  faceStatsSummary?: Record<string, unknown>;
}

export interface TimerSessionResponse {
  id: string;
  userId: string;
  taskId: string | null;
  startTime: string;
  endTime: string | null;
  duration: number;
  pauseCount: number;
  totalPauseTime: number;
  status: SessionStatus;
  faceStatsSummary: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface SessionPauseResponse {
  id: string;
  sessionId: string;
  pauseStart: string;
  pauseEnd: string | null;
  duration: number | null;
  createdAt: string;
}

export class TimerService {
  /**
   * 타이머 세션 시작
   */
  static async start(data?: StartTimerRequest): Promise<TimerSessionResponse> {
    const response = await apiClient.post<TimerSessionResponse>('/timer/start', data || {});
    return response.data;
  }

  /**
   * 타이머 일시정지
   */
  static async pause(sessionId: string): Promise<TimerSessionResponse> {
    const response = await apiClient.post<TimerSessionResponse>(`/timer/${sessionId}/pause`);
    return response.data;
  }

  /**
   * 타이머 재개
   */
  static async resume(sessionId: string): Promise<TimerSessionResponse> {
    const response = await apiClient.post<TimerSessionResponse>(`/timer/${sessionId}/resume`);
    return response.data;
  }

  /**
   * 타이머 종료
   */
  static async stop(sessionId: string, data?: StopTimerRequest): Promise<TimerSessionResponse> {
    const response = await apiClient.post<TimerSessionResponse>(`/timer/${sessionId}/stop`, data || {});
    return response.data;
  }

  /**
   * 타이머 취소
   */
  static async cancel(sessionId: string): Promise<TimerSessionResponse> {
    const response = await apiClient.post<TimerSessionResponse>(`/timer/${sessionId}/cancel`);
    return response.data;
  }

  /**
   * 현재 활성 세션 조회
   */
  static async getActive(): Promise<TimerSessionResponse | null> {
    const response = await apiClient.get<TimerSessionResponse | null>('/timer/active');
    return response.data;
  }

  /**
   * 타이머 히스토리 조회
   */
  static async getHistory(limit: number = 20): Promise<TimerSessionResponse[]> {
    const response = await apiClient.get<TimerSessionResponse[]>(`/timer/history?limit=${limit}`);
    return response.data;
  }

  /**
   * 특정 세션 조회
   */
  static async getById(sessionId: string): Promise<TimerSessionResponse> {
    const response = await apiClient.get<TimerSessionResponse>(`/timer/${sessionId}`);
    return response.data;
  }

  /**
   * 세션의 일시정지 기록 조회
   */
  static async getPauses(sessionId: string): Promise<SessionPauseResponse[]> {
    const response = await apiClient.get<SessionPauseResponse[]>(`/timer/${sessionId}/pauses`);
    return response.data;
  }
}
