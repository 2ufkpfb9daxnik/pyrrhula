"use client";

import { useState, useEffect, useCallback } from "react";
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
}

const CustomNode = ({
  data,
}: {
  data: { username: string; icon: string | null };
}) => (
  <div className="rounded-lg border border-gray-800 bg-gray-900 p-1">
    <Avatar className="size-12">
      <AvatarImage src={data.icon ?? undefined} alt={data.username} />
      <AvatarFallback>{data.username[0]}</AvatarFallback>
    </Avatar>
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

  const fetchFollowGraph = useCallback(async () => {
    try {
      const response = await fetch(`/api/users/${params.id}/followgraph`);
      if (!response.ok) throw new Error("Failed to fetch follow graph");
      const data = await response.json();

      const graphNodes: Node[] = [];
      const graphEdges: Edge[] = [];
      const processedUsers = new Set<string>();

      const processUser = (user: UserNode, x: number, y: number) => {
        if (processedUsers.has(user.id) || user.depth > 2) return;
        processedUsers.add(user.id);

        graphNodes.push({
          id: user.id,
          position: { x, y },
          data: { username: user.username, icon: user.icon },
          type: "custom",
        });

        // フォロー関係を辺として追加
        user.following.forEach((targetId) => {
          graphEdges.push({
            id: `${user.id}->${targetId}`,
            source: user.id,
            target: targetId,
            animated: true,
            markerEnd: {
              type: MarkerType.Arrow,
              color: "#94a3b8",
            },
            style: { stroke: "#94a3b8" },
          });
        });
      };

      // 中心ユーザーを配置
      processUser(data.user, 0, 0);

      setNodes(graphNodes);
      setEdges(graphEdges);
    } catch (error) {
      console.error("Error fetching follow graph:", error);
    } finally {
      setIsLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchFollowGraph();
  }, [fetchFollowGraph]);

  const nodeTypes = {
    custom: CustomNode,
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        読み込み中...
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
        className="bg-background"
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
