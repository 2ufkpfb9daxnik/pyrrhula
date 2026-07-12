"use client";

import type React from "react";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
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
import { Copy } from "lucide-react";
import { storeLoginPassword } from "@/lib/password-credentials";

const ID_TOAST_MS = 8000;

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

      const userId = data.id as string;

      // 表示名ではなくログイン用ユーザーIDをブラウザに覚えさせる
      await storeLoginPassword(userId, password, username);

      const loginResult = await signIn("credentials", {
        id: userId,
        password,
        redirect: false,
      });

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
                    type="button"
                    onClick={() => handleCopyId(userId)}
                    className="mt-1 flex items-center gap-2 rounded-md bg-gray-700 p-2 transition-colors hover:bg-gray-600"
                  >
                    <p className="font-mono text-lg text-yellow-300">{userId}</p>
                    <Copy className="size-4 text-gray-400" />
                  </button>
                  <p className="mt-2 text-sm text-gray-300">
                    ログインにはこのIDが必要です。保存ダイアログが出たら保存してください。
                  </p>
                </div>
              </div>
            </div>
          </div>
        ),
        { duration: ID_TOAST_MS },
      );

      if (loginResult?.ok) {
        setTimeout(() => {
          router.push("/whole");
          router.refresh();
        }, 1200);
      } else {
        setTimeout(() => {
          router.push("/login");
        }, ID_TOAST_MS);
      }
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
            パスワードは漢字・ひらがななども含められます（8文字以上）。非表示のままでも全角入力できます。
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
            <div className="space-y-2">
              <Label htmlFor="username">ユーザー名（表示名・32文字以内）</Label>
              <Input
                id="username"
                name="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="鷽"
                required
                maxLength={32}
                autoComplete="nickname"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">パスワード</Label>
              <PasswordInput
                id="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8字以上"
                required
                minLength={8}
                autoComplete="new-password"
                visible={showPassword}
                onVisibleChange={setShowPassword}
              />
            </div>

            <div className="rounded-md border border-border p-3 text-sm text-muted-foreground">
              アカウントを作成した時点で
              <Link href="/terms" className="mx-1 text-primary hover:underline">
                利用規約
              </Link>
              に同意したものとみなされます。
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
