"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Users, UserPlus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";
import type { ListResponse } from "@/app/_types/list";

export default function ListsOfList() {
  const { data: session } = useSession();

  const { data: lists, isLoading } = useQuery<ListResponse[]>({
    queryKey: ["lists"],
    queryFn: async () => {
      const res = await fetch("/api/lists");
      if (!res.ok) throw new Error("リストの取得に失敗しました");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-[200px] items-center justify-center">
        <LoaderCircle className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!lists?.length) {
    return (
      <div className="rounded-lg border p-8 text-center">
        <h2 className="text-lg font-semibold">リストがありません</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {session
            ? "新しいリストを作成してみましょう"
            : "リストを表示するにはログインが必要です"}
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y rounded-lg border">
      {lists.map((listData) => (
        <Link
          key={listData.list.id}
          href={`/lists/${listData.list.id}`}
          className="flex items-center justify-between p-4 hover:bg-muted/50"
        >
          <div className="space-y-1">
            <h3 className="font-semibold">{listData.list.name}</h3>
            {listData.list.description && (
              <p className="text-sm text-muted-foreground">
                {listData.list.description}
              </p>
            )}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Users className="size-4" />
                <span>{listData.list._count?.members ?? 0}人のメンバー</span>
              </div>
              <div className="flex items-center gap-1">
                <UserPlus className="size-4" />
                <span>
                  {listData.list._count?.followers ?? 0}人のフォロワー
                </span>
              </div>
              {listData.list.isManaged && (
                <span className="text-sm text-muted-foreground">
                  管理リスト
                </span>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
