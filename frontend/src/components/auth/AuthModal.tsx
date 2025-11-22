import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, EyeOff, Timer } from "lucide-react";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
}

export const AuthModal = ({
  open,
  onOpenChange,
  title = "로그인",
  description = "계속하려면 로그인해주세요"
}: AuthModalProps) => {
  const { login, register, isLoading } = useAuth();

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register form state
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login({ email: loginEmail, password: loginPassword });
      onOpenChange(false); // Close modal on success
      // Reset form
      setLoginEmail("");
      setLoginPassword("");
    } catch (error) {
      // Error is handled in AuthContext
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await register({
        email: registerEmail,
        password: registerPassword,
        name: registerName,
      });
      onOpenChange(false); // Close modal on success
      // Reset form
      setRegisterEmail("");
      setRegisterPassword("");
      setRegisterName("");
    } catch (error) {
      // Error is handled in AuthContext
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-800 text-white border-zinc-700 sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center justify-center mb-3">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-orange-500/10">
              <Timer className="w-6 h-6 text-orange-500" />
            </div>
          </div>
          <DialogTitle className="text-2xl font-bold text-center">{title}</DialogTitle>
          <DialogDescription className="text-zinc-400 text-center">
            {description}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="login" className="w-full mt-4">
          <TabsList className="grid w-full grid-cols-2 bg-zinc-900">
            <TabsTrigger
              value="login"
              className="data-[state=active]:bg-zinc-700 data-[state=active]:text-white"
            >
              로그인
            </TabsTrigger>
            <TabsTrigger
              value="register"
              className="data-[state=active]:bg-zinc-700 data-[state=active]:text-white"
            >
              회원가입
            </TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="mt-4">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email" className="text-zinc-300">이메일</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="user@example.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="bg-zinc-900 border-zinc-700 text-white placeholder-zinc-500 focus:border-orange-500 focus:ring-orange-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="login-password" className="text-zinc-300">비밀번호</Label>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showLoginPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="bg-zinc-900 border-zinc-700 text-white placeholder-zinc-500 focus:border-orange-500 focus:ring-orange-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-300"
                    disabled={isLoading}
                  >
                    {showLoginPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold"
                disabled={isLoading}
              >
                {isLoading ? "로그인 중..." : "로그인"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="register" className="mt-4">
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="register-name" className="text-zinc-300">이름</Label>
                <Input
                  id="register-name"
                  type="text"
                  placeholder="홍길동"
                  value={registerName}
                  onChange={(e) => setRegisterName(e.target.value)}
                  required
                  minLength={2}
                  maxLength={100}
                  disabled={isLoading}
                  className="bg-zinc-900 border-zinc-700 text-white placeholder-zinc-500 focus:border-orange-500 focus:ring-orange-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-email" className="text-zinc-300">이메일</Label>
                <Input
                  id="register-email"
                  type="email"
                  placeholder="user@example.com"
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="bg-zinc-900 border-zinc-700 text-white placeholder-zinc-500 focus:border-orange-500 focus:ring-orange-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-password" className="text-zinc-300">비밀번호</Label>
                <div className="relative">
                  <Input
                    id="register-password"
                    type={showRegisterPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    required
                    minLength={8}
                    maxLength={100}
                    disabled={isLoading}
                    className="bg-zinc-900 border-zinc-700 text-white placeholder-zinc-500 focus:border-orange-500 focus:ring-orange-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-300"
                    disabled={isLoading}
                  >
                    {showRegisterPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-zinc-500">
                  최소 8자, 대소문자, 숫자, 특수문자 포함
                </p>
              </div>

              <Button
                type="submit"
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold"
                disabled={isLoading}
              >
                {isLoading ? "가입 중..." : "회원가입"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
