import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { users as mockUsers } from "@/data/mockData";

interface UserStatusContextType {
  isOnline: boolean;
  lastSeen: Date | null;
  mockUserId: string;
  status: "online" | "offline" | "timing" | "resting";
}

const UserStatusContext = createContext<UserStatusContextType | undefined>(
  undefined,
);

const MOCK_USER_ID = mockUsers[0]?.id || "user1";

export const UserStatusProvider = ({ children }: { children: ReactNode }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [lastSeen, setLastSeen] = useState<Date | null>(new Date());
  const [status, setStatus] = useState<
    "online" | "offline" | "timing" | "resting"
  >("online");

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setLastSeen(new Date());
      setStatus("online");
      console.log("User is online (local)");
    };
    const handleOffline = () => {
      setIsOnline(false);
      setLastSeen(new Date());
      setStatus("offline");
      console.log("User is offline (local) - or tab hidden");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        handleOnline();
      } else {
        handleOffline();
      }
    });

    if (navigator.onLine && document.visibilityState === "visible") {
      handleOnline();
    } else {
      handleOffline();
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      document.removeEventListener("visibilitychange", handleOnline);
      document.removeEventListener("visibilitychange", handleOffline);
    };
  }, []);

  return (
    <UserStatusContext.Provider
      value={{ isOnline, lastSeen, mockUserId: MOCK_USER_ID, status }}
    >
      {children}
    </UserStatusContext.Provider>
  );
};

export const useUserStatus = () => {
  const context = useContext(UserStatusContext);
  if (context === undefined) {
    throw new Error("useUserStatus must be used within a UserStatusProvider");
  }
  return context;
};
