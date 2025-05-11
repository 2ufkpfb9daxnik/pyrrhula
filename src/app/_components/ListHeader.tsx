"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { MoreHorizontal, Users, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ListResponse } from "@/app/_types/list";

interface ListHeaderProps {
  list: ListResponse;
}

export function ListHeader({ list }: ListHeaderProps) {
  const router = useRouter();

  const { mutate: toggleFollow, isPending: isToggling } = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/lists/${list.list.id}/followers`, {
        method: list.isFollowing ? "DELETE" : "POST",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "操作に失敗しました");
      }
      toast.success(
        list.isFollowing ? "フォロー解除しました" : "フォローしました"
      );
    },
    onSuccess: () => {
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return (
    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur">
      <div className="flex items-center justify-between border-b p-4">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">{list.list.name}</h1>
          {list.list.description && (
            <p className="text-sm text-muted-foreground">
              {list.list.description}
            </p>
          )}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link
              href={`/lists/${list.list.id}/members`}
              className="flex items-center gap-1 hover:underline"
            >
              <Users className="size-4" />
              {list.list._count?.members ?? 0}人のメンバー
            </Link>
            <Link
              href={`/lists/${list.list.id}/followers`}
              className="flex items-center gap-1 hover:underline"
            >
              <Star className="size-4" />
              {list.list._count?.followers ?? 0}人のフォロワー
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => toggleFollow()}
            disabled={isToggling}
          >
            {list.isFollowing ? "フォロー解除" : "フォロー"}
          </Button>

          {list.isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="size-4" />
                  <span className="sr-only">メニュー</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => router.push(`/lists/${list.list.id}/settings`)}
                >
                  設定
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </div>
  );
}
