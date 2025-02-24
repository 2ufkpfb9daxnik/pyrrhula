"use client";

import { useState, useEffect, Suspense } from "react";
import { Post as PostComponent } from "@/app/_components/post";
import type { Post } from "@/app/_types/post";
import type { User } from "@/app/_types/user";
import { Search } from "@/app/_components/search";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

export const dynamic = "force-dynamic";

// 検索オプションのコンポーネント
function SearchOptions() {
  return (
    <Accordion type="single" collapsible className="mt-8">
      <AccordionItem value="advanced-search">
        <AccordionTrigger>高度な検索オプション</AccordionTrigger>
        <AccordionContent>
          <div className="space-y-4 text-sm text-muted-foreground">
            <h2 className="font-semibold text-foreground">検索クエリの構文</h2>

            <div className="space-y-2">
              <h3 className="font-medium">基本検索</h3>
              <p>キーワードをそのまま入力</p>
              <code className="block rounded bg-muted p-2">
                pyrrhula かわいい
              </code>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium">ユーザーからの投稿を検索</h3>
              <p>from:ユーザーID</p>
              <code className="block rounded bg-muted p-2">from:pyrrhula</code>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium">期間指定</h3>
              <p>since:日付 until:日付</p>
              <code className="block rounded bg-muted p-2">
                since:2024-02-01 until:2024-02-29
              </code>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium">お気に入り数での絞り込み</h3>
              <p>fav_gt:数字 fav_lt:数字</p>
              <code className="block rounded bg-muted p-2">
                fav_gt:10 fav_lt:100
              </code>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium">リポスト数での絞り込み</h3>
              <p>rep_gt:数字 rep_lt:数字</p>
              <code className="block rounded bg-muted p-2">
                rep_gt:5 rep_lt:50
              </code>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium">返信の検索</h3>
              <p>replyTo:投稿ID</p>
              <code className="block rounded bg-muted p-2">replyTo:abc123</code>
            </div>

            {/* ハッシュタグ検索の説明を追加 */}
            <div className="space-y-2">
              <h3 className="font-medium">ハッシュタグ検索</h3>
              <p>ハッシュタグで投稿を検索</p>
              <code className="block rounded bg-muted p-2">#pyrrhula</code>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium">組み合わせ例</h3>
              <code className="block rounded bg-muted p-2">
                #pyrrhula since:2024-02-01 fav_gt:10
              </code>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

// 投稿検索結果コンポーネント
function PostSearchResults({
  posts,
  isLoading,
  currentQuery,
  onRepostSuccess,
  onFavoriteSuccess,
}: {
  posts: Post[];
  isLoading: boolean;
  currentQuery: string;
  onRepostSuccess: () => Promise<void>;
  onFavoriteSuccess: () => Promise<void>;
}) {
  if (isLoading) {
    return (
      <div className="mt-8 text-center text-muted-foreground">
        <Loader2 className="mx-auto size-6 animate-spin" />
        <p className="mt-2">検索中...</p>
      </div>
    );
  }

  if (posts.length === 0 && currentQuery) {
    return (
      <div className="mt-8 text-center text-muted-foreground">
        検索結果が見つかりませんでした
      </div>
    );
  }

  return posts.length > 0 ? (
    <div className="mt-8 space-y-4">
      {posts.map((post) => (
        <PostComponent
          key={post.id}
          post={post}
          onRepostSuccess={onRepostSuccess}
          onFavoriteSuccess={onFavoriteSuccess}
        />
      ))}
    </div>
  ) : null;
}

// ユーザー検索結果コンポーネント
function UserSearchResults({
  users,
  isLoading,
  currentQuery,
}: {
  users: User[];
  isLoading: boolean;
  currentQuery: string;
}) {
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="mt-8 text-center text-muted-foreground">
        <Loader2 className="mx-auto size-6 animate-spin" />
        <p className="mt-2">検索中...</p>
      </div>
    );
  }

  if (users.length === 0 && currentQuery) {
    return (
      <div className="mt-8 text-center text-muted-foreground">
        ユーザーが見つかりませんでした
      </div>
    );
  }

  return users.length > 0 ? (
    <div className="mt-8 space-y-4">
      {users.map((user) => (
        <div
          key={user.id}
          className="cursor-pointer rounded-lg border border-gray-800 p-4 transition-colors hover:bg-gray-900/50"
          onClick={() => router.push(`/user/${user.id}`)}
        >
          <div className="flex items-center space-x-4">
            <Avatar className="size-12">
              <AvatarImage src={user.icon ?? undefined} alt={user.username} />
              <AvatarFallback>{user.username[0]}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-semibold">{user.username}</div>
              <div className="text-sm text-gray-500">@{user.id}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  ) : null;
}

// メインの検索コンテンツコンポーネント
function SearchContent() {
  const searchParams = useSearchParams();
  const [searchType, setSearchType] = useState<"posts" | "users">("posts");
  const [posts, setPosts] = useState<Post[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentQuery, setCurrentQuery] = useState("");

  const handleSearch = async (query: string) => {
    setCurrentQuery(query);
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(query)}&type=${searchType}`
      );
      if (!response.ok) {
        throw new Error("検索に失敗しました");
      }
      const data = await response.json();

      if (searchType === "posts") {
        setPosts(
          data.posts.map((post: any) => ({
            ...post,
            createdAt: new Date(post.createdAt),
            images: post.images || [],
          }))
        );
        if (data.posts.length === 0) {
          toast.info(
            query.startsWith("#")
              ? `ハッシュタグ ${query} の投稿は見つかりませんでした`
              : "投稿が見つかりませんでした"
          );
        }
      } else {
        setUsers(data.users);
        if (data.users.length === 0) {
          toast.info("ユーザーが見つかりませんでした");
        }
      }
    } catch (error) {
      console.error("Error searching:", error);
      toast.error("検索中にエラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  // 検索タイプが変更されたときに再検索
  useEffect(() => {
    if (currentQuery) {
      handleSearch(currentQuery);
    }
  }, [searchType]);

  // URLのクエリパラメータから初期検索
  useEffect(() => {
    const query = searchParams.get("q");
    if (query) {
      handleSearch(query);
    }
  }, [searchParams]);

  return (
    <div className="mx-auto max-w-2xl p-4">
      <h1 className="mb-6 text-2xl font-bold">
        {currentQuery ? (
          currentQuery.startsWith("#") ? (
            <>ハッシュタグ {currentQuery} の検索結果</>
          ) : (
            <>「{currentQuery}」の検索結果</>
          )
        ) : (
          <>検索</>
        )}
      </h1>

      <Search
        onSearch={handleSearch}
        initialQuery={searchParams.get("q") || ""}
      />

      <Tabs
        value={searchType}
        onValueChange={(v) => setSearchType(v as "posts" | "users")}
        className="mt-6"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="posts">投稿</TabsTrigger>
          <TabsTrigger value="users">ユーザー</TabsTrigger>
        </TabsList>
        <TabsContent value="posts">
          <PostSearchResults
            posts={posts}
            isLoading={isLoading}
            currentQuery={currentQuery}
            onRepostSuccess={() => handleSearch(currentQuery)}
            onFavoriteSuccess={() => handleSearch(currentQuery)}
          />
          <SearchOptions />
        </TabsContent>
        <TabsContent value="users">
          <UserSearchResults
            users={users}
            isLoading={isLoading}
            currentQuery={currentQuery}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// メインの検索ページコンポーネント
export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="size-6 animate-spin" />
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
