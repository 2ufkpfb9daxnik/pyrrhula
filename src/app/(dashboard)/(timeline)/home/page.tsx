"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import type { Post } from "@/app/_types/post";
import { Post as PostComponent } from "@/app/_components/post";
import { MakePost } from "@/app/_components/makepost";
import { Search } from "@/app/_components/search";
import { useInterval } from "@/app/_hooks/useInterval";
import { Plus, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
  }, 6000); // この値は例として6秒、実際には60000（60秒）が適切

  // 新しい投稿のみを取得する関数
  const fetchLatestPosts = async () => {
    try {
      const response = await fetch(
        `/api/posts?since=${lastUpdateTime.toISOString()}&includeReposts=true`,
        { next: { revalidate: 60 } }
      );
      if (!response.ok) {
        throw new Error("Failed to fetch new posts");
      }

      const data = await response.json();
      if (data.posts.length > 0) {
        setPosts((prevPosts) => {
          // 一時的な投稿と重複を除去
          const uniquePosts = data.posts
            .map((post: any) => formatPost(post))
            .filter(
              (newPost: Post) =>
                !newPost.id.startsWith("temp-") &&
                !prevPosts.some(
                  (existingPost) => existingPost.id === newPost.id
                )
            );

          return [...uniquePosts, ...prevPosts];
        });
        setLastUpdateTime(new Date());
      }
    } catch (error) {
      console.error("Error fetching new posts:", error);
    }
  };

  // 初回読み込み時の動作
  useEffect(() => {
    if (!session) return;

    fetchUserInfo();
    fetchPosts().then(() => {
      setLastUpdateTime(new Date());
    });
  }, [session]);

  // キーボードショートカット
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
        if (window.innerWidth < 768) {
          setIsDialogOpen(true);
          setTimeout(() => {
            postInputRef.current?.focus();
          }, 100);
        } else {
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
      const response = await fetch(`/api/users/${session.user.id}`, {
        next: { revalidate: 300 }, // 5分間キャッシュ
      });
      if (!response.ok) {
        throw new Error("Failed to fetch user info");
      }

      const data = await response.json();
      setUserInfo(data);
    } catch (error) {
      console.error("Error fetching user info:", error);
    }
  };

  // APIレスポンスの投稿データをフォーマットするヘルパー関数
  const formatPost = (post: any): Post => {
    return {
      ...post,
      createdAt: new Date(post.createdAt),
      repostedAt: post.repostedAt ? new Date(post.repostedAt) : undefined,
      favoritedAt: post.favoritedAt ? new Date(post.favoritedAt) : undefined,
      // 拡散された投稿であれば、repostedByを設定
      repostedBy: post.repostedBy
        ? {
            id: post.repostedBy.id,
            username: post.repostedBy.username,
            icon: post.repostedBy.icon || null,
          }
        : undefined,
      // 元の投稿がある場合はoriginalPostを設定
      originalPost: post.originalPost
        ? {
            ...post.originalPost,
            createdAt: new Date(post.originalPost.createdAt),
            user: post.originalPost.user,
          }
        : undefined,
      // 画像配列の確保
      images: post.images || [],
    };
  };

  const fetchPosts = async (cursor?: string) => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (cursor) {
        params.append("cursor", cursor);
      }
      // 拡散も含めるパラメータを追加
      params.append("includeReposts", "true");

      const response = await fetch(`/api/posts?${params}`, {
        next: { revalidate: 60 }, // 60秒間キャッシュ
      });

      if (!response.ok) {
        throw new Error("Failed to fetch timeline");
      }

      const data = await response.json();

      if (cursor) {
        // 追加読み込みの場合は既存の投稿に追加
        setPosts((prev) => [
          ...prev,
          ...data.posts.map((post: any) => formatPost(post)),
        ]);
      } else {
        // 初回読み込みの場合は置き換え
        setPosts(data.posts.map((post: any) => formatPost(post)));
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
        `/api/posts/search?q=${encodeURIComponent(query)}&timeline=true&includeReposts=true`,
        { next: { revalidate: 60 } }
      );
      if (!response.ok) {
        throw new Error("検索に失敗しました");
      }
      const data = await response.json();
      setPosts(data.posts.map((post: any) => formatPost(post)));
    } catch (error) {
      console.error("Error searching posts:", error);
    }
  };

  const handlePostCreated = (newPost: Post) => {
    setPosts((prev) => {
      // 一時的な投稿（temp-で始まるID）を削除
      const filtered = prev.filter((p) => !p.id.startsWith("temp-"));
      return [newPost, ...filtered];
    });
  };

  const handleFavoriteSuccess = (
    postId: string,
    newCount: number,
    isFavorited: boolean
  ) => {
    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? {
              ...post,
              favorites: newCount,
              isFavorited,
              favoritedAt: isFavorited ? new Date().toISOString() : undefined,
            }
          : post
      )
    );
  };

  const handleRepostSuccess = (
    postId: string,
    newCount: number,
    isReposted: boolean
  ) => {
    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? {
              ...post,
              reposts: newCount,
              isReposted,
              repostedAt: isReposted ? new Date().toISOString() : undefined,
            }
          : post
      )
    );
  };

  if (!session) {
    return (
      <div className="flex h-screen items-center justify-center p-4">
        <div className="rounded-lg border border-gray-800 p-8 text-center">
          <p className="text-gray-500">
            タイムラインを表示するには
            <Link href="/login" className="text-primary">
              ログイン
            </Link>
            が必要です
          </p>
          <br />
          <p>
            もしログインしているのにタイムラインが表示されないなら、しばらく待ってから再読み込みしてみてください。
          </p>
        </div>
      </div>
    );
  }

  if (isLoading && posts.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoaderCircle className="size-20 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <>
      {/* 左サイドバー - モバイルでは非表示 */}
      <div className="fixed hidden h-full w-80 flex-col gap-4 border-r border-gray-800 p-4 md:left-16 md:top-0 md:flex">
        <button
          onClick={handleUserClick}
          className="flex w-full items-start space-x-3 border-b border-gray-800 pb-4 text-left transition-colors hover:bg-gray-800/50"
        >
          <div className="flex items-start space-x-3 border-gray-800 ">
            <Avatar className="size-12">
              <AvatarImage src={userInfo?.icon ?? undefined} />
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
              : undefined
          }
          inputRef={postInputRef}
        />

        <Search onSearch={handleSearch} />
      </div>

      {/* メインコンテンツ */}
      <div className="flex-1 pb-16 md:pb-0">
        <div className="mx-auto max-w-2xl p-4 md:ml-96">
          {/* モバイル用ヘッダー */}
          <div className="mb-4 flex items-center justify-between border-b border-gray-800 pb-4 md:hidden">
            <button
              onClick={handleUserClick}
              className="flex items-center space-x-2"
            >
              <Avatar className="size-8">
                <AvatarImage src={userInfo?.icon ?? undefined} />
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
                  ユーザーを探すには、「すべての投稿」タブを見るか、ユーザーページからユーザー一覧を確認してみてください。
                </p>
              </div>
            ) : (
              posts.map((post) => (
                <PostComponent
                  key={post.id + (post.repostedAt?.toString() || "")}
                  post={post}
                  onRepostSuccess={(newCount, isReposted) =>
                    handleRepostSuccess(post.id, newCount, isReposted)
                  }
                  onFavoriteSuccess={(newCount, isFavorited) =>
                    handleFavoriteSuccess(post.id, newCount, isFavorited)
                  }
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
                      読み込み中...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <RefreshCw className="size-4" />
                      もっと読み込む
                    </div>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

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
              onPostCreated={(post) => {
                handlePostCreated(post);
                setIsDialogOpen(false);
              }}
              inputRef={postInputRef}
              replyTo={
                parentPost
                  ? {
                      id: parentPost.id,
                      content: parentPost.content,
                      username: parentPost.user.username,
                    }
                  : undefined
              }
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
