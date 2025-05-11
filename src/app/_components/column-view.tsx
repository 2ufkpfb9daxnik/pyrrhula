"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { UserInfoPanel } from "./user-info-panel";
import { ColumnController } from "./column-controller";
import { ColumnFrame } from "./column-frame";
import { Switch } from "@/components/ui/switch";
import type { List } from "@/app/_types/list";

type Column = {
  id: string;
  name: string;
  visible: boolean;
  originalId?: string; // リストの元のIDを保持
};

type Settings = {
  hideNav: boolean;
  hideScrollbar: boolean;
};

type ColumnViewProps = {
  onViewChange: () => void;
  userInfo: any;
  userLists: List[];
  followedLists: List[];
};

export function ColumnView({
  onViewChange,
  userInfo,
  userLists,
  followedLists,
}: ColumnViewProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [settings, setSettings] = useState<Settings>({
    hideNav: true,
    hideScrollbar: true,
  });

  // カラムの設定
  const [columns, setColumns] = useState<Column[]>([
    { id: "following", name: "フォロー中", visible: true },
    { id: "global", name: "すべての投稿", visible: true },
    { id: "notifications", name: "通知", visible: true },
    { id: "chat", name: "チャット", visible: true },
    ...userLists.map((list) => ({
      id: `list-${list.id}`,
      name: list.name,
      visible: false,
      originalId: list.id,
    })),
    ...followedLists.map((list) => ({
      id: `followed-list-${list.id}`,
      name: `★ ${list.name}`,
      visible: false,
      originalId: list.id,
    })),
  ]);

  const handleSearch = async (query: string) => {
    router.push(`/search?q=${encodeURIComponent(query)}`);
  };

  const handlePostCreated = (post: any) => {
    // 投稿成功時の処理
  };

  return (
    <div className="fixed inset-0 bg-background z-50">
      <div className="flex h-full">
        {/* 左側のパネル（ユーザー情報、投稿フォーム、検索） */}
        <div className="fixed left-16 top-0 w-80 h-full border-r border-gray-800 p-4 bg-background z-[51]">
          <UserInfoPanel
            userInfo={userInfo}
            onPostCreated={handlePostCreated}
            onSearch={handleSearch}
            isColumnView={true}
            onViewChange={onViewChange}
          />
          <div className="mt-4">
            <div className="space-y-6">
              <ColumnController columns={columns} onChange={setColumns} />

              <div className="space-y-2">
                <h3 className="text-sm font-medium">表示設定</h3>
                <div className="flex items-center justify-between">
                  <label className="text-sm">下部のナビゲーション</label>
                  <Switch
                    checked={!settings.hideNav}
                    onCheckedChange={(checked) =>
                      setSettings((prev) => ({ ...prev, hideNav: !checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm">スクロールバー</label>
                  <Switch
                    checked={!settings.hideScrollbar}
                    onCheckedChange={(checked) =>
                      setSettings((prev) => ({
                        ...prev,
                        hideScrollbar: !checked,
                      }))
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* カラム表示エリア */}
        <div
          className={`ml-[384px] flex-1 overflow-x-auto ${settings.hideScrollbar ? "scrollbar-none" : ""}`}
        >
          <div className="flex gap-4 p-4 h-full">
            {/* フォロー中タイムライン */}
            {columns.find((col) => col.id === "following")?.visible && (
              <div className="flex-none w-80 overflow-hidden rounded-lg">
                <ColumnFrame
                  src="/home"
                  hideNav={settings.hideNav}
                  hideScrollbar={settings.hideScrollbar}
                />
              </div>
            )}

            {/* すべての投稿タイムライン */}
            {columns.find((col) => col.id === "global")?.visible && (
              <div className="flex-none w-80 overflow-hidden rounded-lg">
                <ColumnFrame
                  src="/whole"
                  hideNav={settings.hideNav}
                  hideScrollbar={settings.hideScrollbar}
                />
              </div>
            )}

            {/* リストのタイムライン */}
            {columns
              .filter(
                (col) =>
                  col.visible &&
                  (col.id.startsWith("list-") ||
                    col.id.startsWith("followed-list-")) &&
                  col.originalId // 元のIDが存在する場合のみ表示
              )
              .map((col) => (
                <div
                  key={col.id}
                  className="flex-none w-80 overflow-hidden rounded-lg"
                >
                  <ColumnFrame
                    src={`/lists/${col.originalId}`}
                    hideNav={settings.hideNav}
                    hideScrollbar={settings.hideScrollbar}
                  />
                </div>
              ))}

            {/* 通知 */}
            {columns.find((col) => col.id === "notifications")?.visible && (
              <div className="flex-none w-80 overflow-hidden rounded-lg">
                <ColumnFrame
                  src="/notification"
                  hideNav={settings.hideNav}
                  hideScrollbar={settings.hideScrollbar}
                />
              </div>
            )}

            {/* チャット */}
            {columns.find((col) => col.id === "chat")?.visible && (
              <div className="flex-none w-80 overflow-hidden rounded-lg">
                <ColumnFrame
                  src="/chat"
                  hideNav={settings.hideNav}
                  hideScrollbar={settings.hideScrollbar}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
