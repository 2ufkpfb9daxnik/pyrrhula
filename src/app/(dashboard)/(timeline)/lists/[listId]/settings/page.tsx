"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { LoaderCircle, Settings } from "lucide-react";
import { toast } from "sonner";

interface ListSettings {
  name: string;
  description: string | null;
  includeTimelinePosts: boolean;
  isAdmin: boolean;
}

interface PageProps {
  params: {
    listId: string;
  };
}

export default function ListSettingsPage({ params }: PageProps) {
  const { listId } = params;
  const router = useRouter();
  const { data: session } = useSession();
  const [settings, setSettings] = useState<ListSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [originalSettings, setOriginalSettings] = useState<ListSettings | null>(
    null
  );

  useEffect(() => {
    fetchListSettings();
  }, [listId, session]);

  const fetchListSettings = async () => {
    if (!session) {
      router.push("/login");
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`/api/lists/${listId}`);

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (response.status === 403) {
        router.push(`/lists/${listId}`);
        toast.error("このリストの設定を変更する権限がありません");
        return;
      }

      if (!response.ok) {
        throw new Error("リストの設定を取得できませんでした");
      }

      const data = await response.json();
      const settings: ListSettings = {
        name: data.list.name,
        description: data.list.description,
        includeTimelinePosts: data.list.includeTimelinePosts,
        isAdmin: data.isAdmin,
      };

      if (!settings.isAdmin) {
        router.push(`/lists/${listId}`);
        toast.error("このリストの設定を変更する権限がありません");
        return;
      }

      setSettings(settings);
      setOriginalSettings(settings);
    } catch (error) {
      console.error("Error fetching list settings:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "リストの設定を取得できませんでした"
      );
      router.push(`/lists/${listId}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings || !session || isSaving) return;

    // 変更がない場合は更新をスキップ
    if (
      settings.name === originalSettings?.name &&
      settings.description === originalSettings?.description &&
      settings.includeTimelinePosts === originalSettings?.includeTimelinePosts
    ) {
      toast.info("変更はありません");
      return;
    }

    try {
      setIsSaving(true);

      const response = await fetch(`/api/lists/${listId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: settings.name,
          description: settings.description,
          includeTimelinePosts: settings.includeTimelinePosts,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "リストの設定を更新できませんでした");
      }

      setOriginalSettings(settings);
      toast.success("リストの設定を更新しました");
      router.refresh();
    } catch (error) {
      console.error("Error updating list settings:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "リストの設定を更新できませんでした"
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoaderCircle className="size-12 animate-spin" />
      </div>
    );
  }

  if (!settings) {
    return null;
  }

  return (
    <div className="min-h-screen p-4">
      <div className="mb-6 flex items-center border-b border-gray-800 pb-4">
        <Settings className="mr-2 size-5" />
        <h1 className="text-2xl font-bold">リストの設定</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium">
            リスト名
          </label>
          <Input
            id="name"
            value={settings.name}
            onChange={(e) =>
              setSettings((prev) => prev && { ...prev, name: e.target.value })
            }
            maxLength={50}
            required
          />
          <p className="text-xs text-gray-500">50文字以内で入力してください</p>
        </div>

        <div className="space-y-2">
          <label htmlFor="description" className="text-sm font-medium">
            説明
          </label>
          <Textarea
            id="description"
            value={settings.description || ""}
            onChange={(e) =>
              setSettings(
                (prev) =>
                  prev && { ...prev, description: e.target.value || null }
              )
            }
            maxLength={200}
          />
          <p className="text-xs text-gray-500">
            200文字以内で入力してください（省略可）
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">タイムラインの投稿を含める</p>
            <p className="text-xs text-gray-500">
              フォローしているユーザーの投稿もリストに表示します
            </p>
          </div>
          <Switch
            checked={settings.includeTimelinePosts}
            onCheckedChange={(checked) =>
              setSettings(
                (prev) => prev && { ...prev, includeTimelinePosts: checked }
              )
            }
          />
        </div>

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/lists/${listId}`)}
          >
            キャンセル
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? (
              <LoaderCircle className="mr-2 size-4 animate-spin" />
            ) : null}
            保存
          </Button>
        </div>
      </form>
    </div>
  );
}
