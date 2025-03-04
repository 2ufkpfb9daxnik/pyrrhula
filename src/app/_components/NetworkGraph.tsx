"use client";

import { useEffect, useRef } from "react";
import { Network, Node, Edge } from "vis-network";
import { DataSet } from "vis-data";

interface UserNode {
  id: string;
  username: string;
  icon: string | null;
  followers: string[];
  following: string[];
  depth: number;
  children: UserNode[];
}

interface NetworkGraphProps {
  graphData: UserNode;
  onNodeClick: (nodeId: string) => void;
}

export default function NetworkGraph({
  graphData,
  onNodeClick,
}: NetworkGraphProps) {
  const networkRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // ブラウザ環境でのみ実行されるようにする
    if (typeof window !== "undefined" && networkRef.current) {
      // vis.jsモジュールを動的にインポート
      import("vis-network").then(({ Network }) => {
        import("vis-data").then(({ DataSet }) => {
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
          processNode(graphData, 0);

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
            networkRef.current!,
            { nodes, edges },
            options
          );

          // クリックイベントの処理
          network.on("click", (params) => {
            if (params.nodes.length > 0) {
              onNodeClick(params.nodes[0].toString());
            }
          });

          // ホバーイベントの処理
          network.on("hoverNode", () => {
            if (networkRef.current) {
              networkRef.current.style.cursor = "pointer";
            }
          });

          network.on("blurNode", () => {
            if (networkRef.current) {
              networkRef.current.style.cursor = "default";
            }
          });
        });
      });
    }

    // コンポーネントのアンマウント時にクリーンアップ
    return () => {
      // ここでインスタンスの破棄などのクリーンアップ処理を行う
    };
  }, [graphData, onNodeClick]);

  return (
    <div
      ref={networkRef}
      className="size-full"
      style={{ background: "#0a0a0a" }}
    />
  );
}
