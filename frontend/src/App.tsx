import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { UserStatusProvider } from "@/contexts/UserStatusContext";
import { SidebarProvider } from "@/components/ui/sidebar";
import { CameraPermissionProvider } from "@/contexts/CameraPermissionContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import TodoPage from "./pages/TodoPage";
import GroupPage from "./pages/GroupPage";
import NotFound from "./pages/NotFound";
import PricingPage from "./pages/PricingPage";
import RankingPage from "./pages/RankingPage";
import StatisticsPage from "./pages/StatisticsPage";
import SettingsPage from "./pages/SettingsPage";

const queryClient = new QueryClient();

const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AuthProvider>
          <UserStatusProvider>
            <CameraPermissionProvider>
              <SidebarProvider>
                <Toaster />
                <Sonner
                  position="top-right"
                  toastOptions={{
                    style: {
                      background: "rgba(39, 39, 42, 0.9)",
                      color: "#fff",
                      border: "1px solid rgba(63, 63, 70, 0.3)",
                      backdropFilter: "blur(8px)",
                    },
                    className: "backdrop-blur-sm",
                  }}
                />
                <Routes>
                  <Route path="/auth" element={<Navigate to="/" replace />} />
                  <Route path="/" element={<Index />} />
                  <Route
                    path="/todo"
                    element={
                      <RequireAuth>
                        <TodoPage />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/group/:groupId"
                    element={
                      <RequireAuth>
                        <GroupPage />
                      </RequireAuth>
                    }
                  />
                  <Route path="/pricing" element={<PricingPage />} />
                  <Route
                    path="/ranking"
                    element={
                      <RequireAuth>
                        <RankingPage />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/statistics"
                    element={
                      <RequireAuth>
                        <StatisticsPage />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/settings"
                    element={
                      <RequireAuth>
                        <SettingsPage />
                      </RequireAuth>
                    }
                  />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </SidebarProvider>
            </CameraPermissionProvider>
          </UserStatusProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
