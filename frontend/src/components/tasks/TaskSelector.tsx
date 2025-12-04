import React, { useState, useEffect } from "react";
import { useTimer } from "@/contexts/TimerContext";
import { useTask } from "@/contexts/TaskContext";
import { useAuth } from "@/contexts/AuthContext";
import { formatDuration } from "@/utils/timeUtils";
import {
  Clock,
  BookOpen,
  Briefcase,
  MoreHorizontal,
  GraduationCap,
  Code,
  Music,
  Dumbbell,
  Coffee,
  Heart,
  Plus,
  Zap,
  Film,
  Paintbrush,
  Book,
  Monitor,
  Users,
  Star,
  Home,
  MapPin,
  LogIn,
} from "lucide-react";
import { AddTaskDialog } from "./AddTaskDialog";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// 아이콘 매핑 객체 (아이콘 이름과 컴포넌트 매핑)
const iconMapping: Record<string, React.ElementType> = {
  GraduationCap,
  Briefcase,
  BookOpen,
  Code,
  Music,
  Dumbbell,
  Coffee,
  Heart,
  MoreHorizontal,
  Clock,
  Plus,
  Zap,
  Film,
  Paintbrush,
  Book,
  Monitor,
  Users,
  Star,
  Home,
  MapPin,
};

interface TaskSelectorProps {
  onRequireAuth: (action: string) => boolean;
  disabled?: boolean;
}

export const TaskSelector: React.FC<TaskSelectorProps> = ({
  onRequireAuth,
  disabled = false,
}) => {
  const { startTimer, activeTask, elapsedTime, isActive } = useTimer();
  const { tasks, isLoading: loading } = useTask();
  const { isAuthenticated } = useAuth();
  const [showAddTask, setShowAddTask] = useState(false);
  const [taskTimes, setTaskTimes] = useState<Record<string, number>>({});

  // 작업 시간 로드 및 실시간 업데이트
  const loadTaskTimes = () => {
    try {
      const savedTaskTimes = JSON.parse(
        localStorage.getItem("task_times") || "{}",
      );
      setTaskTimes(savedTaskTimes);
    } catch {
      setTaskTimes({});
    }
  };

  useEffect(() => {
    // 초기 로드
    loadTaskTimes();

    // localStorage 변경 감지
    const handleStorageChange = () => {
      loadTaskTimes();
    };

    window.addEventListener("storage", handleStorageChange);

    // 주기적으로 업데이트 (타이머가 실행 중일 때)
    const interval = setInterval(() => {
      loadTaskTimes();
    }, 1000);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const handleAddTask = () => {
    if (onRequireAuth("새 작업 추가")) {
      setShowAddTask(true);
    }
  };

  // 비로그인 상태
  if (!isAuthenticated) {
    return (
      <div className="mt-8 flex flex-col items-center">
        <div className="flex flex-col items-center gap-4 text-center p-6 rounded-2xl bg-zinc-800/30">
          <div className="space-y-2">
            <p className="text-base font-medium text-zinc-300">
              로그인이 필요합니다
            </p>
            <p className="text-sm text-zinc-500">
              시간 측정을 하려면 먼저 로그인해주세요
            </p>
          </div>
          <Button
            onClick={() => onRequireAuth("시간 측정")}
            className="mt-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl"
          >
            로그인 / 회원가입
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mt-8 flex flex-col items-center">
        <div className="w-full max-w-sm space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-12 bg-zinc-700/20 rounded-md animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (tasks.length === 0 && !showAddTask) {
    return (
      <div className="mt-8 flex flex-col items-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <Clock className="h-8 w-8 text-zinc-400" />
          <div className="space-y-1">
            <p className="text-sm text-zinc-300">아직 작업이 없습니다</p>
            <p className="text-xs text-zinc-500">
              새 작업을 추가하고 시간을 측정해보세요
            </p>
          </div>
        </div>
        <AddTaskDialog open={showAddTask} onOpenChange={setShowAddTask} />
      </div>
    );
  }

  return (
    <div className="mt-20 flex flex-col items-center">
      <div className="w-full max-w-sm space-y-3">
        <div
          className={cn(
            "text-sm font-medium flex items-center gap-2",
            disabled ? "text-zinc-500" : "text-white",
          )}
        >
          작업
          {disabled && (
            <span className="text-xs text-orange-500 bg-orange-500/10 px-2 py-1 rounded-full">
              타이머 진행중
            </span>
          )}
        </div>
        {tasks.map((task) => (
          <button
            key={task.id}
            onClick={() => !disabled && startTimer(task)}
            disabled={disabled}
            className={cn(
              "w-full p-3 flex items-center gap-3 rounded-xl text-white",
              "transition-all duration-300 ease-in-out",
              disabled
                ? "bg-zinc-800/20 cursor-not-allowed opacity-50"
                : "hover:bg-white/10 bg-zinc-800/50",
              activeTask?.id === task.id && !disabled && "bg-orange-500/20",
            )}
          >
            <div className="flex-shrink-0">
              {task.icon && iconMapping[task.icon] ? (
                <div
                  className={cn(
                    "h-6 w-6 rounded-md flex items-center justify-center",
                    activeTask?.id === task.id && "!bg-orange-500/20",
                  )}
                  style={{ backgroundColor: task.color || "#3F3F46" }}
                >
                  {React.createElement(iconMapping[task.icon], {
                    className: "w-4 h-4 text-white",
                  })}
                </div>
              ) : (
                <div
                  className="h-6 w-6 rounded-md flex items-center justify-center"
                  style={{ backgroundColor: task.color || "#3F3F46" }}
                >
                  <span className="text-xs font-medium">
                    {task.title.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            <div className="text-sm font-medium">{task.title}</div>
            <div
              className={cn(
                "text-xs ml-auto transition-all duration-500 ease-in-out",
                activeTask?.id === task.id
                  ? isActive
                    ? "text-orange-500"
                    : "text-white"
                  : "text-zinc-400",
              )}
            >
              <span className="inline-block transition-all duration-500 ease-in-out transform opacity-100">
                {(() => {
                  // 현재 작업이 진행 중인지 확인
                  if (activeTask?.id === task.id && isActive) {
                    return "진행중";
                  }

                  // 진행 중이 아닐 때는 저장된 시간만 표시
                  if (activeTask?.id === task.id && !isActive) {
                    // 현재 선택된 작업이지만 중지된 상태: elapsedTime 사용 (이미 누적시간 포함)
                    return elapsedTime > 0 ? formatDuration(elapsedTime) : "";
                  } else {
                    // 다른 작업: 저장된 시간 또는 백엔드 totalTime 사용
                    const savedTime = taskTimes[task.id] || task.totalTime || 0;
                    return savedTime > 0 ? formatDuration(savedTime) : "";
                  }
                })()}
              </span>
            </div>
          </button>
        ))}
      </div>

      <AddTaskDialog open={showAddTask} onOpenChange={setShowAddTask} />
    </div>
  );
};
