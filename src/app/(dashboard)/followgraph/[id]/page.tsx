"use client";

import { useRouter, useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";
import dynamic from "next/dynamic";
import { fetchJson } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { STALE_TIME_MS } from "@/lib/query-client";

interface UserNode {
  id: string;
  username: string;
  icon: string | null;
  followers: string[];
  following: string[];
  depth: number;
  children: UserNode[];
}

const NetworkGraph = dynamic(() => import("@/app/_components/NetworkGraph"), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen items-center justify-center">
      <LoaderCircle size={48} className="animate-spin text-gray-500" />
    </div>
  ),
});

export default function FollowGraphPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const userId = Array.isArray(params?.id) ? params?.id[0] : params?.id;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.followGraph(userId ?? ""),
    queryFn: async () => {
      const json = await fetchJson<{ user: UserNode }>(
        `/api/users/${userId}/followgraph`,
      );
      return json.user;
    },
    enabled: !!userId,
    staleTime: STALE_TIME_MS,
    refetchOnMount: true,
  });

  if (!userId) {
    return (
      <div className="flex h-screen flex-col items-center justify-center">
        <p className="mb-4 text-red-500">エラーが発生しました: ユーザーIDが見つかりません</p>
        <button
          onClick={() => router.back()}
          className="rounded-md bg-blue-600 px-4 py-2 text-white"
        >
          戻る
        </button>
      </div>
    );
  }

  if (isError && !data) {
    return (
      <div className="flex h-screen flex-col items-center justify-center">
        <p className="mb-4 text-red-500">
          エラーが発生しました:{" "}
          {error instanceof Error
            ? error.message
            : "フォローグラフの取得に失敗しました"}
        </p>
        <button
          onClick={() => router.back()}
          className="rounded-md bg-blue-600 px-4 py-2 text-white"
        >
          戻る
        </button>
      </div>
    );
  }

  if (isLoading && !data) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoaderCircle size={48} className="animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-gray-950">
      {data && (
        <NetworkGraph
          graphData={data}
          onNodeClick={(nodeId) => router.push(`/user/${nodeId}`)}
        />
      )}
    </div>
  );
}
