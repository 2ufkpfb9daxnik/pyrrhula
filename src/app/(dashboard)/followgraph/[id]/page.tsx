"use client";

import { useState, useEffect, useRef } from "react";
import { Network, NodeOptions, Node, Edge } from "vis-network";
import { DataSet } from "vis-data";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";

interface UserNode {
  id: string;
  username: string;
  icon: string | null;
  followers: string[];
  following: string[];
  depth: number;
  children: UserNode[];
}

export default function FollowGraphPage({
  params,
}: {
  params: { id: string };
}) {
  const [isLoading, setIsLoading] = useState(true);
  const networkRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchAndDisplayGraph = async () => {
      try {
        const response = await fetch(`/api/users/${params.id}/followgraph`);
        if (!response.ok) {
          throw new Error("フォローグラフの取得に失敗しました");
        }
        const data = await response.json();

        if (networkRef.current) {
          // ノードとエッジのデータセットを作成
          const nodes = new DataSet<Node>();
          const edges = new DataSet<Edge>();
          const processedNodes = new Set<string>();

          // ノードを再帰的に処理する関数
          const processNode = (user: UserNode, depth: number) => {
            if (depth > 3 || processedNodes.has(user.id)) return;
            processedNodes.add(user.id);

            // ノードを追加
            nodes.add({
              id: user.id,
              label: user.username,
              shape: "circularImage",
              image: user.icon || "/default-avatar.png",
              size: depth === 0 ? 50 : 40 - depth * 5, // 中心ノードを大きく
              borderWidth: 2,
              borderColor: depth === 0 ? "#4CAF50" : "#2196F3",
              brokenImage: "/default-avatar.png",
            } as Node);

            // フォロー関係のエッジを追加
            user.following.forEach((targetId) => {
              edges.add({
                from: user.id,
                to: targetId,
                arrows: "to",
                color: { color: "#666666", opacity: 0.8 },
                width: 1,
              } as Edge);
            });

            // 子ノードを再帰的に処理
            user.children.forEach((child) => {
              if (
                user.following.includes(child.id) ||
                user.followers.includes(child.id)
              ) {
                processNode(child, depth + 1);
              }
            });
          };

          // グラフの描画を開始
          processNode(data.user, 0);

          // ネットワークの設定
          const options = {
            physics: {
              stabilization: true,
              barnesHut: {
                gravitationalConstant: -80000,
                springConstant: 0.001,
                springLength: 200,
              },
            },
            interaction: {
              navigationButtons: true,
              keyboard: true,
              hover: true,
            },
            nodes: {
              font: {
                size: 16,
                color: "#ffffff",
              },
            },
            edges: {
              smooth: {
                enabled: true,
                type: "continuous",
                forceDirection: "none",
                roundness: 0.5,
              },
            },
          };

          // ネットワークを作成
          const network = new Network(
            networkRef.current,
            { nodes, edges },
            options
          );

          // クリックイベントの処理
          network.on("click", (params) => {
            if (params.nodes.length > 0) {
              router.push(`/user/${params.nodes[0]}`);
            }
          });

          // ホバーイベントの処理
          network.on("hoverNode", (params) => {
            networkRef.current!.style.cursor = "pointer";
          });

          network.on("blurNode", () => {
            networkRef.current!.style.cursor = "default";
          });
        }
      } catch (error) {
        console.error("Error fetching graph:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAndDisplayGraph();
  }, [params.id, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoaderCircle size={48} className="text-gray-500" />
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-gray-950">
      <div
        ref={networkRef}
        className="size-full"
        style={{ background: "#0a0a0a" }}
      />
    </div>
  );
}
