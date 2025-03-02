"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { LoaderCircle } from "lucide-react";

export default function ProfileEditPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isDataFetching, setIsDataFetching] = useState(true);
  const [formData, setFormData] = useState({
    username: "",
    profile: "",
    icon: "",
  });
  const [initialData, setInitialData] = useState({
    username: "",
    profile: "",
    icon: "",
  });

  // 現在のプロフィール情報を取得する
  useEffect(() => {
    if (session?.user?.id) {
      fetchUserProfile();
    }
  }, [session?.user?.id]);

  const fetchUserProfile = async () => {
    try {
      setIsDataFetching(true);
      const response = await fetch(
        `/api/users/${session?.user?.id}?type=profile`
      );

      if (!response.ok) {
        throw new Error("プロフィール情報の取得に失敗しました");
      }

      const userData = await response.json();

      // 取得したデータで初期化
      const profileData = {
        username: userData.username || "",
        profile: userData.profile || "",
        icon: userData.icon || "",
      };

      setFormData(profileData);
      setInitialData(profileData);
    } catch (error) {
      console.error("プロフィール情報取得エラー:", error);
      toast.error("プロフィール情報の取得に失敗しました");
    } finally {
      setIsDataFetching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // データに変更がなければ処理をスキップ
    if (JSON.stringify(formData) === JSON.stringify(initialData)) {
      router.push(`/user/${session?.user?.id}`);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/users/${session?.user?.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("プロフィールの更新に失敗しました");
      }

      toast.success("プロフィールを更新しました");
      router.push(`/user/${session?.user?.id}`);
      router.refresh();
    } catch (error) {
      toast.error("エラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  // ユーザーデータをロード中の表示
  if (isDataFetching) {
    return (
      <div className="container mx-auto max-w-2xl p-4">
        <div className="flex flex-col items-center justify-center space-y-4 py-12">
          <LoaderCircle className="size-8 animate-spin text-primary" />
          <p>プロフィール情報を読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl p-4">
      <h1 className="mb-6 text-2xl font-bold">プロフィール編集</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-2 block">ユーザー名</label>
          <Input
            value={formData.username}
            onChange={(e) =>
              setFormData({ ...formData, username: e.target.value })
            }
            maxLength={32}
            required
          />
        </div>
        <div>
          <label className="mb-2 block">プロフィール</label>
          <Textarea
            value={formData.profile}
            onChange={(e) =>
              setFormData({ ...formData, profile: e.target.value })
            }
            maxLength={500}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {formData.profile.length}/500文字
          </p>
        </div>
        <div>
          <label className="mb-2 block">アイコン画像URL</label>
          <Input
            value={formData.icon}
            onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
            type="url"
            placeholder="https://api.dicebear.com/7.x/bottts/svg?seed=あなたのユーザーID"
          />
          {formData.icon && (
            <div className="mt-2 flex items-center space-x-4">
              <div className="size-16 overflow-hidden rounded-full">
                <img
                  src={formData.icon}
                  alt="プレビュー"
                  className="size-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src =
                      "https://api.dicebear.com/7.x/bottts/svg?seed=fallback";
                  }}
                />
              </div>
              <span className="text-sm text-muted-foreground">プレビュー</span>
            </div>
          )}
        </div>
        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isLoading}
          >
            キャンセル
          </Button>
          <Button
            type="submit"
            disabled={
              isLoading ||
              JSON.stringify(formData) === JSON.stringify(initialData)
            }
          >
            {isLoading
              ? "更新中..."
              : JSON.stringify(formData) === JSON.stringify(initialData)
                ? "変更なし"
                : "更新"}
          </Button>
        </div>
      </form>
    </div>
  );
}
