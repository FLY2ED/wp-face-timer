// API Types based on backend DTOs

// Auth Types
export interface RegisterDto {
  email: string;
  password: string;
  name: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RefreshTokenDto {
  refreshToken: string;
}

export interface UserResponseDto {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  user: UserResponseDto;
  expiresIn: number;
}

export interface RefreshResponseDto {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// Task Types
export interface CreateTaskDto {
  title: string;
  icon?: string;
  color?: string;
}

export interface UpdateTaskDto {
  title?: string;
  icon?: string;
  color?: string;
  isActive?: boolean;
}

export interface TaskResponseDto {
  id: string;
  title: string;
  icon?: string;
  color?: string;
  totalTime: number;
  isActive: boolean;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Timer Types
export interface FaceStatsDto {
  averageAttentionScore: number;
  fatigueDistribution: {
    alert: number;
    normal: number;
    tired: number;
    exhausted: number;
  };
  emotionDistribution: {
    neutral: number;
    happy: number;
    focused: number;
    distracted: number;
  };
  drowsyPercentage: number;
}

export interface StartTimerDto {
  taskId: string;
}

export interface CompleteSessionDto {
  endTime: string;
  duration: number;
  pauseCount: number;
  faceStats: FaceStatsDto;
}

export interface SessionPauseDto {
  pausedAt: string;
  resumedAt?: string;
  duration?: number;
}

export interface TimerSessionResponseDto {
  id: string;
  taskId: string;
  startTime: string;
  endTime?: string;
  duration: number;
  pauseCount: number;
  isCompleted: boolean;
  faceStats?: FaceStatsDto;
  pauses: SessionPauseDto[];
  createdAt: string;
  updatedAt: string;
}

// Statistics Types
export interface DailyStatsDto {
  date: string;
  totalTime: number;
  sessionCount: number;
  averageAttentionScore: number;
  topTasks: Array<{
    taskId: string;
    title: string;
    duration: number;
  }>;
}

export interface WeeklyStatsDto {
  weekStart: string;
  weekEnd: string;
  totalTime: number;
  sessionCount: number;
  dailyBreakdown: DailyStatsDto[];
}

// Ranking Types
export interface RankingUserDto {
  userId: string;
  name: string;
  rank: number;
  totalTime: number;
  achievementCount: number;
}

export interface AchievementDto {
  id: string;
  type: string;
  title: string;
  description: string;
  icon: string;
  earnedAt: string;
}

// API Error Response
export interface ApiErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
}
