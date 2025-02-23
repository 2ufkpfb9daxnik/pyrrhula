"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import type { PostProps } from "@/app/_types/post";
import type { Post } from "@/app/_types/post";
import { Post as PostComponent } from "@/app/_components/post"; // PostコンポーネントをPostComponentとしてインポート
import { MakePost } from "@/app/_components/makepost";
import { Search } from "@/app/_components/search";
import { useInterval } from "@/app/_hooks/useInterval";
// 右下の投稿ボタン用コンポーネントを追加
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { LoaderCircle } from "lucide-react";

interface UserInfo {
  icon: string | null;
  username: string;
  id: string;
}

export default function HomePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { data: session } = useSession();
  const router = useRouter();
  const [parentPost, setParentPost] = useState<Post | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const postInputRef = useRef<HTMLTextAreaElement>(null);

  // 60秒ごとにタイムラインを更新
  useInterval(() => {
    if (session) {
      fetchLatestPosts();
    }
  }, 6000); // 60秒 = 60000ミリ秒

  // 新しい投稿のみを取得する関数
  const fetchLatestPosts = async () => {
    try {
      const response = await fetch(
        `/api/posts?since=${lastUpdateTime.toISOString()}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch new posts");
      }

      const data = await response.json();
      if (data.posts.length > 0) {
        // 新しい投稿がある場合のみ、状態を更新
        setPosts((prevPosts) => [
          ...data.posts.map((post: any) => ({
            ...post,
            createdAt: new Date(post.createdAt),
          })),
          ...prevPosts,
        ]);
        setLastUpdateTime(new Date());
      }
    } catch (error) {
      console.error("Error fetching new posts:", error);
    }
  };

  // 初回読み込み時の動作を修正
  useEffect(() => {
    if (!session) return;

    fetchUserInfo();
    fetchPosts().then(() => {
      setLastUpdateTime(new Date());
    });
  }, [session]);

  // キーボードショートカットのイベントリスナーを追加
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (
        e.key === "n" &&
        !e.ctrlKey &&
        !e.metaKey &&
        document.activeElement?.tagName !== "TEXTAREA" &&
        document.activeElement?.tagName !== "INPUT"
      ) {
        e.preventDefault();
        // モバイル表示の場合はダイアログを開く
        if (window.innerWidth < 768) {
          setIsDialogOpen(true);
          // ダイアログが開いた後にフォーカスを設定するため、少し遅延させる
          setTimeout(() => {
            postInputRef.current?.focus();
          }, 100);
        } else {
          // デスクトップ表示の場合は直接フォーカス
          postInputRef.current?.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, []);

  const handleUserClick = () => {
    if (session?.user?.id) {
      router.push(`/user/${session.user.id}`);
    }
  };

  const fetchUserInfo = async () => {
    if (!session?.user?.id) return;

    try {
      const response = await fetch(`/api/users/${session.user.id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch user info");
      }

      const data = await response.json();
      setUserInfo(data);
    } catch (error) {
      console.error("Error fetching user info:", error);
    }
  };

  const fetchPosts = async (cursor?: string) => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (cursor) {
        params.append("cursor", cursor);
      }

      const response = await fetch(`/api/posts?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch timeline");
      }
      const data = await response.json();

      if (cursor) {
        // 追加読み込みの場合は既存の投稿に追加
        setPosts((prev) => [
          ...prev,
          ...data.posts.map((post: any) => ({
            ...post,
            createdAt: new Date(post.createdAt),
          })),
        ]);
      } else {
        // 初回読み込みの場合は置き換え
        setPosts(
          data.posts.map((post: any) => ({
            ...post,
            createdAt: new Date(post.createdAt),
          }))
        );
      }

      setHasMore(data.hasMore);
      setNextCursor(data.nextCursor);
    } catch (error) {
      console.error("Error fetching timeline:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    try {
      const response = await fetch(
        `/api/posts/search?q=${encodeURIComponent(query)}&timeline=true`
      );
      if (!response.ok) {
        throw new Error("検索に失敗しました");
      }
      const data = await response.json();
      setPosts(
        data.posts.map((post: any) => ({
          ...post,
          createdAt: new Date(post.createdAt),
        }))
      );
    } catch (error) {
      console.error("Error searching posts:", error);
    }
  };

  const handlePostCreated = () => {
    // 新しい投稿が作成されたら、タイムラインを更新
    fetchPosts();
  };

  if (!session) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-gray-500">
          タイムラインを表示するにはログインが必要です
        </p>
        <br></br>
        <p>
          もしログインしているのにタイムラインが表示されないなら、しばらく待ってから再読み込みしてみてください。
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoaderCircle className="size-20 text-gray-500" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* 左サイドバー - モバイルでは非表示 */}
      <div className="fixed hidden h-full w-80 flex-col gap-4 border-r border-gray-800 p-4 md:left-16 md:top-0 md:flex">
        <button
          onClick={handleUserClick}
          className="flex w-full items-start space-x-3 border-b border-gray-800 pb-4 text-left transition-colors hover:bg-gray-800/50"
        >
          <div className="flex items-start space-x-3 border-gray-800 ">
            <Avatar className="size-12">
              <AvatarImage src={session?.user?.image ?? undefined} />
              <AvatarFallback>{session?.user?.name?.[0]}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-semibold">{session?.user?.name}</span>
              <span className="text-sm text-muted-foreground">
                @{session?.user?.id}
              </span>
            </div>
          </div>
        </button>

        <MakePost
          onPostCreated={handlePostCreated}
          replyTo={
            parentPost
              ? {
                  id: parentPost.id,
                  content: parentPost.content,
                  username: parentPost.user.username,
                }
              : null
          }
          inputRef={postInputRef}
        />

        <Search onSearch={handleSearch} />
      </div>

      {/* メインコンテンツ */}
      <main className="flex-1">
        <div className="mx-auto max-w-2xl p-4 md:ml-96">
          {/* モバイル用ヘッダー */}
          <div className="mb-4 flex items-center justify-between border-b border-gray-800 pb-4 md:hidden">
            <button
              onClick={handleUserClick}
              className="flex items-center space-x-2"
            >
              <Avatar className="size-8">
                <AvatarImage src={session?.user?.image ?? undefined} />
                <AvatarFallback>{session?.user?.name?.[0]}</AvatarFallback>
              </Avatar>
              <span className="font-semibold">{session?.user?.name}</span>
            </button>
            <Search onSearch={handleSearch} />
          </div>

          <div className="space-y-4">
            {posts.length === 0 ? (
              <div className="rounded-lg border border-gray-800 p-8 text-center">
                <p className="text-gray-500">
                  まだ投稿がありません。
                  <br />
                  フォローしているユーザーの投稿がここに表示されます。
                  <br />
                  ユーザーを探すには、地球儀マークのアイコンから全体タイムラインを見るとか、人々のアイコンからユーザー一覧を覗いてみてください。
                </p>
              </div>
            ) : (
              posts.map((post) => (
                <PostComponent
                  key={post.id}
                  post={post}
                  onRepostSuccess={fetchPosts}
                  onFavoriteSuccess={fetchPosts}
                />
              ))
            )}

            {/* もっと読み込むボタン */}
            {hasMore && (
              <div className="flex justify-center py-4">
                <Button
                  variant="outline"
                  onClick={() => fetchPosts(nextCursor)}
                  disabled={isLoading}
                  className="w-full max-w-xs"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <LoaderCircle className="size-4 animate-spin" />
                    </div>
                  ) : (
                    "もっと読み込む"
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* モバイル用投稿ボタン */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button
            className="fixed bottom-20 right-4 size-14 rounded-full p-0 shadow-lg md:hidden"
            variant="default"
          >
            <Plus className="size-6" />
          </Button>
        </DialogTrigger>
        <DialogContent className="w-[calc(100%-32px)] max-w-[425px]">
          <div className="pt-6">
            <MakePost
              onPostCreated={handlePostCreated}
              inputRef={postInputRef} // モバイル用にも参照を渡す
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
