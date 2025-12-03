import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut } from "lucide-react";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  open,
  onOpenChange,
}) => {
  const { user, logout, isLoading } = useAuth();

  const handleLogout = async () => {
    await logout();
    onOpenChange(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900/95 backdrop-blur-sm text-white border-zinc-700 sm:max-w-[400px] shadow-xl rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">프로필</DialogTitle>
          <DialogDescription className="text-zinc-400">
            계정 정보를 확인하세요.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="space-y-6">
            <div className="flex flex-col items-center space-y-4">
              <Avatar className="h-24 w-24 border-2 border-zinc-700">
                <AvatarFallback className="bg-zinc-700 text-zinc-300 text-2xl">
                  {user?.name?.substring(0, 1).toUpperCase() || user?.email?.substring(0, 1).toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="text-center">
                <p className="text-xl font-semibold text-white">{user?.name || '사용자'}</p>
                <p className="text-sm text-zinc-400">{user?.email || ''}</p>
              </div>
            </div>

            <div className="space-y-3 bg-zinc-800/50 rounded-lg p-4">
              <div>
                <Label className="text-zinc-500 text-xs">이름</Label>
                <p className="text-white text-sm mt-0.5">{user?.name || '-'}</p>
              </div>
              <div>
                <Label className="text-zinc-500 text-xs">이메일</Label>
                <p className="text-white text-sm mt-0.5">{user?.email || '-'}</p>
              </div>
              <div>
                <Label className="text-zinc-500 text-xs">가입일</Label>
                <p className="text-white text-sm mt-0.5">
                  {user?.createdAt ? formatDate(user.createdAt) : '-'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-zinc-700">
          <Button
            variant="destructive"
            className="w-full font-semibold py-2.5 rounded-md"
            onClick={handleLogout}
            disabled={isLoading}
          >
            <LogOut className="h-4 w-4 mr-2" />
            {isLoading ? '로그아웃 중...' : '로그아웃'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
