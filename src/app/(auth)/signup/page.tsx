"use client";

import type React from "react";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import toast from "react-hot-toast";
import { Copy } from "lucide-react"; // アイコンを追加

// タイムアウトの時間をトースト表示時間より少し長めに設定
const REDIRECT_DELAY = 11000; // 11秒

export default function SignupPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success("IDをコピーしました");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "エラーが発生しました");
      }

      toast.custom(
        (t) => (
          <div
            className={`${
              t.visible
                ? "animate-in fade-in slide-in-from-top-full"
                : "animate-out fade-out slide-out-to-top-full"
            } pointer-events-auto flex w-full max-w-md rounded-lg bg-gray-800 shadow-lg ring-1 ring-black/5`}
          >
            <div className="w-0 flex-1 p-4">
              <div className="flex items-start">
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-gray-100">
                    重要: あなたのユーザーID
                  </p>
                  <button
                    onClick={() => handleCopyId(data.id)}
                    className="mt-1 flex items-center gap-2 rounded-md bg-gray-700 p-2 transition-colors hover:bg-gray-600"
                  >
                    <p className="font-mono text-lg text-yellow-300">
                      {data.id}
                    </p>
                    <Copy className="size-4 text-gray-400" />
                  </button>
                  <p className="mt-2 text-sm text-gray-300">
                    このIDはログインに必要です。必ず保存してください。
                  </p>
                  <p className="mt-2 text-sm text-gray-400">
                    {Math.ceil(REDIRECT_DELAY / 1000)}
                    秒後にログインページに移動します...
                  </p>
                </div>
              </div>
            </div>
          </div>
        ),
        {
          duration: REDIRECT_DELAY - 1000,
        }
      );

      // 遅延してからリダイレクト
      setTimeout(() => {
        router.push("/login");
      }, REDIRECT_DELAY);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold">
            新規登録
          </CardTitle>
          <CardDescription className="text-center">
            パスワードに漢字やひらがなを使うときは一旦パスワードを表示させるようにしてください
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">ユーザー名(可変)</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="鷽"
                required
                pattern="^[a-zA-Z0-9_-]{1,32}$"
                title="Use 1-32 alphanumeric characters, underscore, or hyphen"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">パスワード</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="8字以上"
                  required
                  minLength={8}
                  inputMode="text"
                />
                <Button
                  type="button"
                  variant="ghost"
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "非表示" : "表示"}
                </Button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "新規登録中..." : "新規登録"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            すでにアカウントがある場合{" "}
            <a href="/login" className="text-primary hover:underline">
              ログイン
            </a>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
