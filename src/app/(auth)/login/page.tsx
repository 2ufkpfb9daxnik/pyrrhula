"use client";

import { useState, useEffect } from "react";
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
  CardContent,
  CardFooter,
  CardDescription,
} from "@/components/ui/card";
import Link from "next/link";
import {
  loadSavedLoginPassword,
  storeLoginPassword,
} from "@/lib/password-credentials";

export default function LoginPage() {
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = await loadSavedLoginPassword();
      if (cancelled || !saved) return;
      setId(saved.userId);
      setPassword(saved.password);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        id,
        password,
        redirect: false,
      });

      if (!result?.ok) {
        setError("ユーザーIDまたはパスワードが正しくありません");
        return;
      }

      await storeLoginPassword(id, password);

      router.push("/whole");
      router.refresh();
    } catch (err) {
      console.error("ログインエラー:", err);
      setError("ログイン中にエラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold">
            ログイン
          </CardTitle>
          <CardDescription className="text-center">
            ユーザーIDとユーザー名は違います。新規登録したときに表示されたものがユーザーIDです。わからない場合は
            <Link href="/user" className="text-blue-500 hover:underline">
              ユーザー一覧
            </Link>
            から探せる可能性があります。
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
              <Label htmlFor="id">ユーザーID</Label>
              <Input
                id="id"
                name="username"
                type="text"
                value={id}
                onChange={(e) => setId(e.target.value)}
                placeholder="ユーザーIDを入力"
                required
                disabled={isLoading}
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">パスワード</Label>
              <PasswordInput
                id="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="パスワードを入力"
                required
                minLength={7}
                autoComplete="current-password"
                disabled={isLoading}
                visible={showPassword}
                onVisibleChange={setShowPassword}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !id || !password}
            >
              {isLoading ? "ログイン中..." : "ログイン"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <p className="text-center text-sm text-muted-foreground">
            アカウントをお持ちでない場合は{" "}
            <a href="/signup" className="text-primary hover:underline">
              新規登録
            </a>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
