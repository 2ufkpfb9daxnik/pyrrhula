"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface User {
  id?: string;
  user_id?: string;
  username: string;
  icon: string | null;
}

interface CreateGroupChatModalProps {
  onGroupCreated: () => void;
}

export function CreateGroupChatModal({
  onGroupCreated,
}: CreateGroupChatModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const router = useRouter();

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `/api/search?type=users&q=${encodeURIComponent(query)}`
      );

      if (!response.ok) throw new Error("ユーザーの検索に失敗しました");
      const data = await response.json();
      console.log("API Response:", data);

      // APIレスポンスの形式を統一化
      const users = data.users
        .map((user: any) => ({
          id: user.id, // 内部処理用にidを保持
          user_id: user.id, // API連携用にuser_idも保持
          username: user.username,
          icon: user.icon,
        }))
        .filter(
          (user: User) =>
            !selectedUsers.some(
              (selected) =>
                selected.id === user.id || selected.user_id === user.user_id
            )
        );

      setSearchResults(users);

      if (users.length === 0 && data.users.length > 0) {
        toast.info("検索されたユーザーは既に選択されています");
      }
    } catch (error) {
      console.error("検索エラー:", error);
      toast.error("ユーザーの検索に失敗しました");
    } finally {
      setIsSearching(false);
    }
  };

  const handleUserSelect = (user: User) => {
    setSelectedUsers([...selectedUsers, user]);
    setSearchResults(
      searchResults.filter(
        (result) => result.id !== user.id && result.user_id !== user.user_id
      )
    );
  };

  const handleUserRemove = (user: User) => {
    const userId = user.id || user.user_id;
    if (!userId) return;

    setSelectedUsers(
      selectedUsers.filter(
        (selectedUser) =>
          selectedUser.id !== userId && selectedUser.user_id !== userId
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim() || selectedUsers.length === 0) {
      toast.error("グループ名とメンバーを入力してください");
      return;
    }

    setIsLoading(true);
    try {
      const requestBody = {
        name: groupName.trim(),
        memberIds: selectedUsers.map((user) => user.id), // user.idのみを使用
      };
      console.log("Selected Users:", selectedUsers); // 選択されたユーザーの完全な情報を出力
      console.log("Request body:", requestBody);

      const response = await fetch("/api/chat/group", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      // レスポンスの詳細をログ出力
      console.log("Response status:", response.status);
      const responseData = await response.json();
      console.log("Response data:", responseData);

      if (!response.ok) {
        throw new Error(responseData.error || "グループの作成に失敗しました");
      }

      toast.success("グループを作成しました");
      onGroupCreated();
      setIsOpen(false);
      router.push(`/chat/group/${responseData.id}`);
    } catch (error) {
      console.error("Submit Error:", error);
      toast.error(
        error instanceof Error ? error.message : "グループの作成に失敗しました"
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Input要素の変更をdebounceで最適化
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        searchUsers(searchQuery);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, selectedUsers]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger>
        <Button variant="outline">グループチャットを作成</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>新しいグループチャット</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 1. グループ名入力 */}
          <div>
            <Label htmlFor="groupName">グループ名</Label>
            <Input
              id="groupName"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="グループ名を入力"
              maxLength={50}
              required
            />
          </div>

          {/* 2. 選択済みメンバー表示エリア */}
          <div className="rounded-md border p-2">
            <Label>選択済みメンバー ({selectedUsers.length}人)</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {selectedUsers.length === 0 ? (
                <p className="text-sm text-gray-500">
                  メンバーが選択されていません
                </p>
              ) : (
                selectedUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1"
                  >
                    <Avatar className="size-6">
                      <AvatarImage src={user.icon ?? undefined} />
                      <AvatarFallback>{user.username[0]}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{user.username}</span>
                    <button
                      type="button"
                      onClick={() => handleUserRemove(user)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 3. メンバー検索入力エリア */}
          <div>
            <Label>新しいメンバーを追加</Label>
            <div className="relative mt-1">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ユーザーID/ユーザー名で検索"
              />
              <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-gray-500" />
            </div>
          </div>

          {/* 4. 検索結果表示エリア */}
          <div className="max-h-48 overflow-y-auto rounded-md border p-2">
            {searchResults.length > 0 ? (
              searchResults.map((user) => (
                <div
                  key={`search-${user.id}`} // keyを修正
                  className="flex cursor-pointer items-center justify-between rounded-lg p-2 hover:bg-gray-100"
                  onClick={() => handleUserSelect(user)}
                >
                  <div className="flex items-center gap-2">
                    <Avatar className="size-8">
                      <AvatarImage src={user.icon ?? undefined} />
                      <AvatarFallback>{user.username[0]}</AvatarFallback>
                    </Avatar>
                    <span>{user.username}</span>
                  </div>
                  <Button type="button" variant="ghost" size="sm">
                    追加
                  </Button>
                </div>
              ))
            ) : (
              <p className="py-2 text-center text-sm text-gray-500">
                {searchQuery.trim()
                  ? "該当するユーザーが見つかりません"
                  : "ユーザー名またはIDで検索してください"}
              </p>
            )}
          </div>

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? "作成中..." : "グループを作成"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
