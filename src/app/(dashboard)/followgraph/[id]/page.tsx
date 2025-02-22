"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface UserNode {
  id: string;
  username: string;
  icon: string | null;
  followers: string[];
  following: string[];
  depth: number;
  children: UserNode[];
}

const CustomNode = ({
  data,
}: {
  data: { username: string; icon: string | null; onClick: () => void };
}) => (
  <div
    className="rounded-lg border border-gray-800 bg-gray-900 p-2 cursor-pointer hover:bg-gray-800"
    onClick={data.onClick}
  >
    <div className="flex flex-col items-center">
      <Avatar className="size-12 mb-1">
        <AvatarImage src={data.icon ?? undefined} alt={data.username} />
        <AvatarFallback>{data.username[0]}</AvatarFallback>
      </Avatar>
      <span className="text-xs text-gray-300">{data.username}</span>
    </div>
  </div>
);

export default function FollowGraphPage({
  params,
}: {
  params: { id: string };
}) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const nodeTypes = useMemo(
    () => ({
      custom: CustomNode,
    }),
    []
  );

  const calculatePosition = (
    depth: number,
    index: number,
    totalAtDepth: number
  ) => {
    const radius = depth * 300; // 200から300に増加
    const angleStep = (2 * Math.PI) / totalAtDepth;
    // 開始角度をずらして、ノードがより均等に配置されるように
    const angle = index * angleStep + Math.PI / 4;
    return {
      x: radius * Math.cos(angle),
      y: radius * Math.sin(angle),
    };
  };

  const processGraphData = useCallback(
    (userData: UserNode) => {
      const graphNodes: Node[] = [];
      const graphEdges: Edge[] = [];
      const nodesAtDepth = new Map<number, number>();
      const processedNodes = new Map<string, number>();
      // processGraphData 関数内の processNode 関数を修正
      const processNode = (node: UserNode) => {
        if (processedNodes.has(node.id)) return;

        // 深さごとのノード数をカウント
        nodesAtDepth.set(node.depth, (nodesAtDepth.get(node.depth) || 0) + 1);
        const indexAtDepth = nodesAtDepth.get(node.depth)! - 1;
        processedNodes.set(node.id, indexAtDepth);

        // ノードを追加
        const position =
          node.depth === 0
            ? { x: 0, y: 0 }
            : calculatePosition(
                node.depth,
                indexAtDepth,
                nodesAtDepth.get(node.depth) || 1 // ここを修正
              );

        graphNodes.push({
          id: node.id,
          position: position,
          data: {
            username: node.username,
            icon: node.icon,
            onClick: () => router.push(`/user/${node.id}`),
          },
          type: "custom",
        });

        // 子ノードを処理（先に全ノードを追加）
        node.children.forEach((child) => processNode(child));

        // エッジを追加（全ノードの追加後に実行）
        if (node.following) {
          node.following.forEach((targetId) => {
            if (processedNodes.has(targetId)) {
              // ターゲットノードが存在する場合のみエッジを追加
              graphEdges.push({
                id: `${node.id}->${targetId}`,
                source: node.id,
                target: targetId,
                type: "smoothstep", // エッジの種類を変更
                animated: true,
                markerEnd: {
                  type: MarkerType.Arrow,
                  width: 20,
                  height: 20,
                  color: "#94a3b8",
                },
                style: {
                  stroke: "#94a3b8",
                  strokeWidth: 1.5,
                },
              });
            }
          });
        }
      };

      processNode(userData);
      return { nodes: graphNodes, edges: graphEdges };
    },
    [router]
  );

  const fetchFollowGraph = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/users/${params.id}/followgraph`);
      if (!response.ok) throw new Error("フォローグラフの取得に失敗しました");

      const data = await response.json();
      console.log("API Response:", data);

      const { nodes: graphNodes, edges: graphEdges } = processGraphData(
        data.user
      );
      setNodes(graphNodes);
      setEdges(graphEdges);
    } catch (error) {
      console.error("Error fetching follow graph:", error);
    } finally {
      setIsLoading(false);
    }
  }, [params.id, processGraphData]);

  useEffect(() => {
    fetchFollowGraph();
  }, [fetchFollowGraph]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.1}
        maxZoom={1.5}
        defaultEdgeOptions={{
          type: "smoothstep",
          animated: true,
          style: {
            stroke: "#94a3b8",
            strokeWidth: 1.5,
          },
          markerEnd: {
            type: MarkerType.Arrow,
            width: 20,
            height: 20,
            color: "#94a3b8",
          },
        }}
        // ノードの配置をより適切に
        fitViewOptions={{
          padding: 0.2,
          minZoom: 0.1,
          maxZoom: 1.5,
        }}
        className="bg-background"
      >
        <Background color="#94a3b8" gap={16} />
        <Controls />
      </ReactFlow>
    </div>
  );
}
