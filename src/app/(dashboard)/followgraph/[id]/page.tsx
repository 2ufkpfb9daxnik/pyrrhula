"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import dynamic from "next/dynamic";

// コンポーネントのタイプ定義
interface UserNode {
  id: string;
  username: string;
  icon: string | null;
  followers: string[];
  following: string[];
  depth: number;
  children: UserNode[];
}

// グラフコンポーネントを別ファイルに分離
const NetworkGraph = dynamic(() => import("@/app/_components/NetworkGraph"), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen items-center justify-center">
      <LoaderCircle size={48} className="animate-spin text-gray-500" />
    </div>
  ),
});

export default function FollowGraphPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [graphData, setGraphData] = useState<UserNode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const userId = Array.isArray(params?.id) ? params?.id[0] : params?.id;

  useEffect(() => {
    const fetchGraphData = async () => {
      if (!userId) {
        setError("ユーザーIDが見つかりません");
        setIsLoading(false);
        return;
      }
      try {
        setIsLoading(true);
        const response = await fetch(`/api/users/${userId}/followgraph`);

        if (!response.ok) {
          throw new Error("フォローグラフの取得に失敗しました");
        }

        const data = await response.json();
        setGraphData(data.user);
      } catch (error) {
        console.error("Error fetching graph:", error);
        setError(
          error instanceof Error
            ? error.message
            : "フォローグラフの取得に失敗しました",
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchGraphData();
  }, [userId]);

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center">
        <p className="mb-4 text-red-500">エラーが発生しました: {error}</p>
        <button
          onClick={() => router.back()}
          className="rounded-md bg-blue-600 px-4 py-2 text-white"
        >
          戻る
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoaderCircle size={48} className="animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-gray-950">
      {graphData && (
        <NetworkGraph
          graphData={graphData}
          onNodeClick={(nodeId) => router.push(`/user/${nodeId}`)}
        />
      )}
    </div>
  );
}
