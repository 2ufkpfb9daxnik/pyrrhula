//app/admin/page.tsx
"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    // セッションがロード済みで、未ログインまたは管理者でない場合
    if (
      status === "unauthenticated" ||
      (status === "authenticated" && !session?.user?.isAdmin)
    ) {
      toast.error("管理者権限が必要です");
      router.push("/"); // ホームページにリダイレクト
    }
  }, [status, session, router]);

  const updateStats = async () => {
    try {
      const response = await fetch("/api/admin/update-stats", {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "統計の更新に失敗しました");
      }

      const data = await response.json();
      toast.success(data.message || "統計を更新しました");
    } catch (error) {
      console.error("Error updating stats:", error);
      toast.error(
        error instanceof Error ? error.message : "統計の更新に失敗しました"
      );
    }
  };

  // ローディング中の表示
  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-gray-500" />
      </div>
    );
  }

  // 管理者でない場合は何も表示しない（useEffectでリダイレクトされる）
  if (!session?.user?.isAdmin) {
    return null;
  }

  return (
    <div className="container mx-auto p-4">
      <Card className="mx-auto max-w-2xl">
        <CardContent className="p-6">
          <h1 className="mb-6 text-2xl font-bold">管理者ページ</h1>
          <div className="space-y-4">
            <Button onClick={updateStats} className="w-full">
              ユーザー統計を更新
            </Button>
            {/* 他の管理者機能をここに追加 */}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
