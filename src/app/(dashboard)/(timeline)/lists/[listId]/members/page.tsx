"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LoaderCircle, Users, ShieldCheck, ShieldX } from "lucide-react";
import { toast } from "sonner";
import type { User } from "@/app/_types/user";
import { PowerPagination } from "@/components/ui/power-pagination";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Member extends User {
  isAdmin: boolean;
  status: "pending" | "approved";
  isFollowing?: boolean;
  adminStatus?: "pending" | "approved";
}

interface PaginationInfo {
  total: number;
  pages: number;
  currentPage: number;
  hasMore: boolean;
}

interface ApiResponse {
  members: {
    userId: string;
    isAdmin: boolean;
    status: "pending" | "approved";
    adminStatus?: "pending" | "approved";
    user: {
      id: string;
      username: string;
      icon: string | null;
    };
    isFollowing?: boolean;
  }[];
  isAdmin: boolean;
  pagination: {
    total: number;
    pages: number;
  };
  hasMore: boolean;
}

interface PageProps {
  params: {
    listId: string;
  };
}

export default function ListMembersPage({ params }: PageProps) {
  const { listId } = params;
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [processingMembers, setProcessingMembers] = useState<Set<string>>(
    new Set()
  );
  const [isListAdmin, setIsListAdmin] = useState(false);
  const [showAdminDialog, setShowAdminDialog] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const router = useRouter();
  const { data: session } = useSession();

  useEffect(() => {
    fetchMembers(pagination?.currentPage || 1);
  }, [session, listId]);

  const fetchMembers = async (page: number) => {
    try {
      setIsLoading(true);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: "5",
        includeFollowStatus: session ? "true" : "false",
      });

      const response = await fetch(`/api/lists/${listId}/members?${params}`);

      if (!response.ok) {
        throw new Error("メンバー情報の取得に失敗しました");
      }

      const data: ApiResponse = await response.json();

      setMembers(
        data.members.map((m) => ({
          id: m.userId,
          username: m.user.username,
          icon: m.user.icon,
          isAdmin: m.isAdmin,
          status: m.status,
          isFollowing: m.isFollowing,
          adminStatus: m.adminStatus,
        }))
      );
      setIsListAdmin(data.isAdmin);
      setPagination({
        total: data.pagination?.total || 0,
        pages:
          data.pagination?.pages ||
          Math.ceil((data.pagination?.total || 0) / 5),
        currentPage: page,
        hasMore: data.hasMore || false,
      });
    } catch (error) {
      console.error("Error fetching members:", error);
      toast.error(
        error instanceof Error ? error.message : "一時的なエラーが発生しました"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminAction = async (
    userId: string,
    action: "invite" | "approve" | "reject"
  ) => {
    if (!session || !isListAdmin || processingMembers.has(userId)) return;

    setProcessingMembers((prev) => new Set(prev).add(userId));

    try {
      const response = await fetch(
        `/api/lists/${listId}/members/${userId}/admin`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "操作に失敗しました");
      }

      const messages = {
        invite: "管理者として招待しました",
        approve: "管理者として承認しました",
        reject: "管理者申請を却下しました",
      };

      toast.success(messages[action]);
      await fetchMembers(pagination?.currentPage || 1);
    } catch (error) {
      console.error("Admin action error:", error);
      toast.error(
        error instanceof Error ? error.message : "操作に失敗しました"
      );
    } finally {
      setProcessingMembers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!session || !isListAdmin) return;

    if (processingMembers.has(userId)) return;
    setProcessingMembers((prev) => new Set(prev).add(userId));

    try {
      const response = await fetch(
        `/api/lists/${listId}/members?userId=${userId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "メンバーの削除に失敗しました");
      }

      setMembers((prev) => prev.filter((member) => member.id !== userId));
      toast.success("メンバーを削除しました");
    } catch (error) {
      console.error("Remove member error:", error);
      toast.error(
        error instanceof Error ? error.message : "操作に失敗しました"
      );
    } finally {
      setProcessingMembers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const handleFollow = async (userId: string, isFollowing: boolean) => {
    if (!session) {
      router.push("/login");
      return;
    }

    if (processingMembers.has(userId)) return;
    setProcessingMembers((prev) => new Set(prev).add(userId));

    try {
      const response = await fetch(`/api/follow/${userId}`, {
        method: isFollowing ? "DELETE" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.status === 409) {
        if (!isFollowing) {
          setMembers((prev) =>
            prev.map((member) =>
              member.id === userId ? { ...member, isFollowing: true } : member
            )
          );
          toast.success("既にフォロー済みです");
          return;
        }
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "フォロー状態の更新に失敗しました");
      }

      setMembers((prev) =>
        prev.map((member) =>
          member.id === userId
            ? { ...member, isFollowing: !member.isFollowing }
            : member
        )
      );

      toast.success(isFollowing ? "フォロー解除しました" : "フォローしました");
    } catch (error) {
      console.error("Follow error:", error);
      toast.error(
        error instanceof Error ? error.message : "操作に失敗しました"
      );
    } finally {
      setProcessingMembers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoaderCircle className="size-12 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center border-b border-gray-800 pb-4">
        <Users className="mr-2 size-5" />
        <h1 className="text-2xl font-bold">メンバー一覧</h1>
      </div>

      <div className="space-y-4">
        {members.map((member) => (
          <div
            key={member.id}
            className="flex items-center justify-between border-b border-gray-800 px-4 py-3"
          >
            <div
              className="flex flex-1 cursor-pointer items-center space-x-3"
              onClick={() => router.push(`/user/${member.id}`)}
            >
              <Avatar className="size-12 shrink-0">
                <AvatarImage
                  src={member.icon ?? undefined}
                  alt={member.username}
                />
                <AvatarFallback>{member.username[0]}</AvatarFallback>
              </Avatar>
              <div>
                <div className="font-semibold">{member.username}</div>
                <div className="text-sm text-gray-400">@{member.id}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex flex-col items-end space-y-2">
                {session?.user?.id !== member.id && (
                  <Button
                    variant="outline"
                    className={`w-28 ${
                      member.isFollowing
                        ? "bg-secondary text-secondary-foreground"
                        : "bg-white text-black"
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFollow(member.id, member.isFollowing || false);
                    }}
                    disabled={!session || processingMembers.has(member.id)}
                  >
                    {processingMembers.has(member.id) ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : member.isFollowing ? (
                      "フォロー解除"
                    ) : (
                      "フォローする"
                    )}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-28 border border-gray-800"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/followgraph/${member.id}`);
                  }}
                >
                  フォローグラフ
                </Button>
              </div>

              <div className="ml-2 flex items-center space-x-2">
                {member.isAdmin && (
                  <span className="rounded bg-primary/20 px-2 py-1 text-xs text-primary">
                    管理者
                  </span>
                )}
                {member.adminStatus === "pending" && (
                  <span className="rounded bg-yellow-500/20 px-2 py-1 text-xs text-yellow-500">
                    管理者承認待ち
                  </span>
                )}
                {member.status === "pending" && (
                  <span className="rounded bg-yellow-500/20 px-2 py-1 text-xs text-yellow-500">
                    承認待ち
                  </span>
                )}
                {isListAdmin && session?.user?.id !== member.id && (
                  <div className="flex gap-2">
                    {!member.isAdmin && !member.adminStatus && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAdminAction(member.id, "invite");
                        }}
                        disabled={processingMembers.has(member.id)}
                      >
                        <ShieldCheck className="mr-1 size-4" />
                        管理者に招待
                      </Button>
                    )}
                    {member.adminStatus === "pending" && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAdminAction(member.id, "approve");
                          }}
                          disabled={processingMembers.has(member.id)}
                        >
                          <ShieldCheck className="mr-1 size-4" />
                          承認
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAdminAction(member.id, "reject");
                          }}
                          disabled={processingMembers.has(member.id)}
                        >
                          <ShieldX className="mr-1 size-4" />
                          却下
                        </Button>
                      </>
                    )}
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveMember(member.id);
                      }}
                      disabled={processingMembers.has(member.id)}
                    >
                      削除
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {members.length === 0 && (
        <div className="py-8 text-center text-gray-500">メンバーはいません</div>
      )}

      {pagination && pagination.pages > 1 && (
        <PowerPagination
          currentPage={pagination.currentPage}
          totalPages={pagination.pages}
          onPageChange={fetchMembers}
        />
      )}

      <Dialog open={showAdminDialog} onOpenChange={setShowAdminDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>管理者として招待</DialogTitle>
            <DialogDescription>
              {selectedMember?.username}を管理者として招待しますか？
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}
