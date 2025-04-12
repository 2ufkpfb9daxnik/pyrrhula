"use client";

import { useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface User {
  id: string;
  username: string;
  icon: string | null;
}

interface UserSearchSelectProps {
  selectedUsers: User[];
  onSelect: (users: User[]) => void;
}

export function UserSearchSelect({
  selectedUsers = [],
  onSelect,
}: UserSearchSelectProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);

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

      if (!data || !Array.isArray(data.users)) {
        console.error("Invalid API response:", data);
        throw new Error("不正なAPIレスポンスです");
      }

      // 既に選択されているユーザーを除外
      const filteredUsers = data.users.filter(
        (user: User) =>
          !selectedUsers.some((selected) => selected.id === user.id)
      );

      setSearchResults(filteredUsers);

      if (filteredUsers.length === 0 && data.users.length > 0) {
        toast.info("検索されたユーザーは既に選択されています");
      }
    } catch (error) {
      console.error("検索エラー:", error);
      toast.error(
        error instanceof Error ? error.message : "ユーザーの検索に失敗しました"
      );
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // debounceの時間をさらに調整
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timeoutId = setTimeout(() => {
      searchUsers(searchQuery);
    }, 750); // 750msに延長してAPI呼び出しを抑制

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleUserRemove = (id: string) => {
    const updatedUsers = selectedUsers.filter((user) => user.id !== id);
    onSelect(updatedUsers);
  };

  const handleUserSelect = (user: User) => {
    const updatedUsers = [...selectedUsers, user];
    onSelect(updatedUsers);
    setSearchQuery(""); // Clear search after selection
  };

  return (
    <div className="space-y-4">
      {/* 選択済みメンバー表示エリア */}
      <div className="flex flex-wrap gap-2">
        {selectedUsers.map((user) => (
          <Badge key={user.id} variant="secondary" className="gap-1">
            <Avatar className="mr-1 size-4">
              <AvatarImage src={user.icon ?? undefined} />
              <AvatarFallback>{user.username[0]}</AvatarFallback>
            </Avatar>
            {user.username}
            <X
              className="size-3 cursor-pointer"
              onClick={() => handleUserRemove(user.id)}
            />
          </Badge>
        ))}
      </div>

      {/* 検索入力エリア */}
      <div className="relative">
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ユーザー名/IDで検索"
          className="w-full"
        />
        <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-gray-500" />
      </div>

      {/* 検索結果表示エリア */}
      {searchQuery && (
        <div className="max-h-48 overflow-y-auto rounded-md border p-2">
          {isSearching ? (
            <p className="py-2 text-center text-sm text-gray-500">検索中...</p>
          ) : searchResults.length > 0 ? (
            searchResults.map((user) => (
              <div
                key={user.id}
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
              該当するユーザーが見つかりません
            </p>
          )}
        </div>
      )}
    </div>
  );
}
