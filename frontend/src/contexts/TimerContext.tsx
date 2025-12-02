import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { Task } from "@/types";
import {
  TimerService,
  SessionStatus,
  TimerSessionResponse,
} from "@/services/api/timer.service";
import { AuthService } from "@/services/api/auth.service";

interface TimerContextType {
  activeTask: Task | null;
  isActive: boolean;
  isPaused: boolean;
  elapsedTime: number;
  sessionId: string | null;
  startTimer: (task: Task) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: (faceStatsSummary?: Record<string, unknown>) => void;
  resetTimer: () => void;
  resetDailyRecords: () => void;
}

const defaultContext: TimerContextType = {
  activeTask: null,
  isActive: false,
  isPaused: false,
  elapsedTime: 0,
  sessionId: null,
  startTimer: () => {},
  pauseTimer: () => {},
  resumeTimer: () => {},
  stopTimer: () => {},
  resetTimer: () => {},
  resetDailyRecords: () => {},
};

const TimerContext = createContext<TimerContextType>(defaultContext);

export const useTimer = () => useContext(TimerContext);

// 로컬 스토리지 키
const TIMER_STATE_KEY = "timer_state";
const TASK_TIMES_KEY = "task_times";
const LAST_RESET_DATE_KEY = "last_reset_date";

export const TimerProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [lastElapsedTime, setLastElapsedTime] = useState<number>(0);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // API 호출 중복 방지를 위한 ref
  const isApiCalling = useRef(false);

  // 작업별 누적 시간을 저장하는 객체
  const [taskTimes, setTaskTimes] = useState<Record<string, number>>({});

  // 로그인 상태 확인
  const isAuthenticated = useCallback(() => {
    return AuthService.isAuthenticated();
  }, []);

  // 하루 기록 초기화 체크 함수
  const checkAndResetDaily = useCallback(() => {
    try {
      const today = new Date().toDateString();
      const lastResetDate = localStorage.getItem(LAST_RESET_DATE_KEY);

      if (lastResetDate !== today) {
        // 기록 초기화
        setTaskTimes({});
        localStorage.removeItem(TASK_TIMES_KEY);
        localStorage.removeItem(TIMER_STATE_KEY);

        // 현재 실행 중인 타이머도 초기화
        setActiveTask(null);
        setIsActive(false);
        setIsPaused(false);
        setElapsedTime(0);
        setLastElapsedTime(0);
        setStartTime(null);
        setSessionId(null);

        // 마지막 초기화 날짜 업데이트
        localStorage.setItem(LAST_RESET_DATE_KEY, today);
      }
    } catch (error) {
      console.error("하루 기록 초기화 체크 중 오류:", error);
    }
  }, []);

  // 수동 하루 기록 초기화 함수
  const resetDailyRecords = useCallback(() => {
    try {
      // 기록 초기화
      setTaskTimes({});
      localStorage.removeItem(TASK_TIMES_KEY);
      localStorage.removeItem(TIMER_STATE_KEY);

      // 현재 실행 중인 타이머도 초기화
      setActiveTask(null);
      setIsActive(false);
      setIsPaused(false);
      setElapsedTime(0);
      setLastElapsedTime(0);
      setStartTime(null);
      setSessionId(null);

      // 마지막 초기화 날짜를 오늘로 설정
      const today = new Date().toDateString();
      localStorage.setItem(LAST_RESET_DATE_KEY, today);
    } catch (error) {
      console.error("하루 기록 수동 초기화 중 오류:", error);
    }
  }, []);

  // 백엔드에서 활성 세션 복구
  const restoreActiveSession = useCallback(async () => {
    if (!isAuthenticated()) return;

    try {
      const activeSession = await TimerService.getActive();
      if (activeSession) {
        // 활성 세션이 있으면 복구
        const startTimeMs = new Date(activeSession.startTime).getTime();
        const now = Date.now();
        const elapsed =
          activeSession.duration * 1000 +
          (now - startTimeMs - activeSession.totalPauseTime * 1000);

        setSessionId(activeSession.id);
        setActiveTask({
          id: activeSession.taskId || "unknown",
          title: "복구된 세션",
        });
        setElapsedTime(elapsed > 0 ? elapsed : 0);
        setLastElapsedTime(elapsed > 0 ? elapsed : 0);
        setStartTime(startTimeMs);

        if (activeSession.status === SessionStatus.ACTIVE) {
          setIsActive(true);
          setIsPaused(false);
        } else if (activeSession.status === SessionStatus.PAUSED) {
          setIsActive(true);
          setIsPaused(true);
        }
      }
    } catch (error) {
      console.error("활성 세션 복구 중 오류:", error);
    }
  }, [isAuthenticated]);

  // 로컬 스토리지에서 타이머 상태 불러오기
  useEffect(() => {
    // 먼저 하루 초기화 체크
    checkAndResetDaily();

    try {
      const savedTaskTimes = localStorage.getItem(TASK_TIMES_KEY);
      if (savedTaskTimes) {
        setTaskTimes(JSON.parse(savedTaskTimes));
      }

      // 로그인 상태면 백엔드에서 활성 세션 확인
      if (isAuthenticated()) {
        restoreActiveSession();
      } else {
        // 비로그인 상태면 로컬 스토리지에서 복원
        const savedTimerState = localStorage.getItem(TIMER_STATE_KEY);
        if (savedTimerState) {
          const { task, elapsed, active, paused } = JSON.parse(savedTimerState);
          if (task) {
            setActiveTask(task);
            setElapsedTime(elapsed || 0);
            setLastElapsedTime(elapsed || 0);

            if (active && !paused) {
              setIsActive(true);
              setIsPaused(false);
              setStartTime(Date.now() - elapsed);
            } else {
              setIsActive(active || false);
              setIsPaused(paused || false);
            }
          }
        }
      }
    } catch (error) {
      console.error("타이머 상태 로드 중 오류:", error);
    }
  }, [checkAndResetDaily, isAuthenticated, restoreActiveSession]);

  // 앱이 활성화될 때마다 날짜 체크 (포커스 이벤트)
  useEffect(() => {
    const handleFocus = () => {
      checkAndResetDaily();
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkAndResetDaily();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [checkAndResetDaily]);

  // 타이머 상태 저장
  const saveTimerState = useCallback(() => {
    try {
      localStorage.setItem(TASK_TIMES_KEY, JSON.stringify(taskTimes));

      if (activeTask) {
        localStorage.setItem(
          TIMER_STATE_KEY,
          JSON.stringify({
            task: activeTask,
            elapsed: elapsedTime,
            active: isActive,
            paused: isPaused,
            sessionId: sessionId,
          }),
        );
      }
    } catch (error) {
      console.error("타이머 상태 저장 중 오류:", error);
    }
  }, [activeTask, elapsedTime, isActive, isPaused, taskTimes, sessionId]);

  // 타이머 상태가 변경될 때마다 저장
  useEffect(() => {
    saveTimerState();
  }, [saveTimerState]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isActive && !isPaused) {
      interval = setInterval(() => {
        const now = Date.now();
        if (startTime) {
          const currentElapsed = now - startTime;
          setElapsedTime(currentElapsed);
          setLastElapsedTime(currentElapsed);
        }
      }, 10);
    } else if (interval) {
      clearInterval(interval);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isActive, isPaused, startTime]);

  const startTimer = useCallback(
    async (task: Task) => {
      // 이전 작업이 있었던 경우 해당 작업의 누적 시간 사용
      const previousTimeForTask = taskTimes[task.id] || 0;

      setActiveTask(task);
      setIsActive(true);
      setIsPaused(false);

      if (previousTimeForTask > 0) {
        setStartTime(Date.now() - previousTimeForTask);
        setElapsedTime(previousTimeForTask);
        setLastElapsedTime(previousTimeForTask);
      } else {
        setStartTime(Date.now());
        setElapsedTime(0);
        setLastElapsedTime(0);
      }

      // 로그인 상태면 백엔드에 세션 시작 요청
      if (isAuthenticated() && !isApiCalling.current) {
        isApiCalling.current = true;
        try {
          // 기본 태스크(default-*)는 taskId 없이 시작
          const isDefaultTask =
            task.id.startsWith("default-") || task.id.startsWith("local-");
          const response = await TimerService.start(
            isDefaultTask ? undefined : { taskId: task.id },
          );
          setSessionId(response.id);
        } catch (error) {
          console.error("타이머 시작 API 오류:", error);
        } finally {
          isApiCalling.current = false;
        }
      }
    },
    [taskTimes, isAuthenticated],
  );

  const pauseTimer = useCallback(async () => {
    if (isActive && !isPaused) {
      setIsPaused(true);
      setLastElapsedTime(elapsedTime);

      // 로그인 상태이고 세션 ID가 있으면 백엔드에 일시정지 요청
      if (isAuthenticated() && sessionId && !isApiCalling.current) {
        isApiCalling.current = true;
        try {
          await TimerService.pause(sessionId);
        } catch (error) {
          console.error("타이머 일시정지 API 오류:", error);
        } finally {
          isApiCalling.current = false;
        }
      }
    }
  }, [isActive, isPaused, elapsedTime, isAuthenticated, sessionId]);

  const resumeTimer = useCallback(async () => {
    if (isPaused) {
      const newStartTime = Date.now() - lastElapsedTime;
      setStartTime(newStartTime);
      setIsPaused(false);

      // 로그인 상태이고 세션 ID가 있으면 백엔드에 재개 요청
      if (isAuthenticated() && sessionId && !isApiCalling.current) {
        isApiCalling.current = true;
        try {
          await TimerService.resume(sessionId);
        } catch (error) {
          console.error("타이머 재개 API 오류:", error);
        } finally {
          isApiCalling.current = false;
        }
      }
    }
  }, [isPaused, lastElapsedTime, isAuthenticated, sessionId]);

  const stopTimer = useCallback(
    async (faceStatsSummary?: Record<string, unknown>) => {
      // 작업별 누적 시간 저장
      if (isActive && activeTask) {
        const taskId = activeTask.id;
        const updatedTaskTimes = { ...taskTimes };
        updatedTaskTimes[taskId] = elapsedTime;

        setTaskTimes(updatedTaskTimes);
        setLastElapsedTime(elapsedTime);

        // localStorage에 저장
        localStorage.setItem(TASK_TIMES_KEY, JSON.stringify(updatedTaskTimes));
      }

      setIsActive(false);
      setIsPaused(false);
      setStartTime(null);

      // 타이머가 멈추면 현재 상태를 localStorage에 저장
      localStorage.setItem(
        TIMER_STATE_KEY,
        JSON.stringify({
          task: activeTask,
          elapsed: elapsedTime,
          active: false,
          paused: false,
        }),
      );

      // 로그인 상태이고 세션 ID가 있으면 백엔드에 정지 요청
      if (isAuthenticated() && sessionId && !isApiCalling.current) {
        isApiCalling.current = true;
        try {
          await TimerService.stop(sessionId, { faceStatsSummary });
          setSessionId(null);
        } catch (error) {
          console.error("타이머 정지 API 오류:", error);
        } finally {
          isApiCalling.current = false;
        }
      }
    },
    [isActive, activeTask, taskTimes, elapsedTime, isAuthenticated, sessionId],
  );

  const resetTimer = useCallback(async () => {
    // 작업별 시간 초기화도 추가
    if (activeTask) {
      const taskId = activeTask.id;
      const updatedTaskTimes = { ...taskTimes };
      delete updatedTaskTimes[taskId];
      setTaskTimes(updatedTaskTimes);

      // localStorage에 저장
      localStorage.setItem(TASK_TIMES_KEY, JSON.stringify(updatedTaskTimes));
    }

    // 진행 중인 세션이 있으면 취소
    if (isAuthenticated() && sessionId && !isApiCalling.current) {
      isApiCalling.current = true;
      try {
        await TimerService.cancel(sessionId);
      } catch (error) {
        console.error("타이머 취소 API 오류:", error);
      } finally {
        isApiCalling.current = false;
      }
    }

    setActiveTask(null);
    setIsActive(false);
    setIsPaused(false);
    setElapsedTime(0);
    setLastElapsedTime(0);
    setStartTime(null);
    setSessionId(null);

    // 타이머 상태 초기화
    localStorage.removeItem(TIMER_STATE_KEY);
  }, [activeTask, taskTimes, isAuthenticated, sessionId]);

  return (
    <TimerContext.Provider
      value={{
        activeTask,
        isActive,
        isPaused,
        elapsedTime,
        sessionId,
        startTimer,
        pauseTimer,
        resumeTimer,
        stopTimer,
        resetTimer,
        resetDailyRecords,
      }}
    >
      {children}
    </TimerContext.Provider>
  );
};
