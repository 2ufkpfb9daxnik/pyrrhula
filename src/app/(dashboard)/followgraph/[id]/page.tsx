"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import * as d3 from "d3";
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

interface D3Node extends d3.SimulationNodeDatum {
  id: string;
  username: string;
  icon: string | null;
}

interface D3Link extends d3.SimulationLinkDatum<D3Node> {
  source: string;
  target: string;
}

export default function FollowGraphPage({
  params,
}: {
  params: { id: string };
}) {
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const svgRef = useRef<SVGSVGElement>(null);

  // データフェッチと描画のためのuseEffectを追加
  useEffect(() => {
    const fetchAndRenderGraph = async () => {
      try {
        const response = await fetch(`/api/users/${params.id}/followgraph`);
        if (!response.ok) {
          throw new Error("フォローグラフの取得に失敗しました");
        }
        const data = await response.json();
        console.log("Fetched data:", data); // デバッグ用
        renderGraph(data.user);
      } catch (error) {
        console.error("Error fetching graph:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAndRenderGraph();
  }, [params.id]);

  const renderGraph = (userData: UserNode) => {
    if (!svgRef.current) return;

    // SVGをクリア
    d3.select(svgRef.current).selectAll("*").remove();

    const width = window.innerWidth;
    const height = window.innerHeight;

    // ズーム機能の設定
    const zoom = d3
      .zoom()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        container.attr("transform", event.transform);
      });

    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .call(zoom as any); // 直接zoomを適用

    // ズーム可能なコンテナを作成
    const container = svg.append("g").attr("class", "container");

    // ノードとリンクのデータを準備
    const nodes: D3Node[] = [];
    const links: D3Link[] = [];
    const processedNodes = new Set<string>();

    const processNode = (node: UserNode) => {
      if (processedNodes.has(node.id)) return;
      processedNodes.add(node.id);

      nodes.push({
        id: node.id,
        username: node.username,
        icon: node.icon,
      });

      node.following.forEach((targetId) => {
        if (processedNodes.has(targetId)) {
          links.push({
            source: node.id,
            target: targetId,
          });
        }
      });

      node.children.forEach((child) => processNode(child));
    };

    processNode(userData);

    // 矢印マーカーを定義
    container
      .append("defs")
      .append("marker")
      .attr("id", "arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 45)
      .attr("refY", 0)
      .attr("markerWidth", 8)
      .attr("markerHeight", 8)
      .attr("orient", "auto")
      .append("path")
      .attr("fill", "#94a3b8")
      .attr("d", "M0,-5L10,0L0,5");

    // フォースシミュレーションを作成
    const simulation = d3
      .forceSimulation<D3Node>(nodes)
      .force(
        "link",
        d3
          .forceLink<D3Node, D3Link>(links)
          .id((d) => d.id)
          .distance(200)
      )
      .force("charge", d3.forceManyBody().strength(-800))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(80));

    // リンク（辺）を描画
    const link = container
      .append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", "#94a3b8")
      .attr("stroke-width", 2)
      .attr("marker-end", "url(#arrow)");

    // ノードのグループを作成
    const node = container
      .append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .call(
        d3
          .drag<any, D3Node>()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended)
      )
      .on("click", (event, d) => {
        router.push(`/user/${d.id}`);
      });

    // ノードの背景を追加
    node
      .append("circle")
      .attr("r", 35)
      .attr("fill", "#1f2937")
      .attr("stroke", "#374151")
      .attr("stroke-width", 2);

    // ユーザーアイコンを追加
    node
      .append("image")
      .attr("x", -25)
      .attr("y", -25)
      .attr("width", 50)
      .attr("height", 50)
      .attr("clip-path", "circle(25px)")
      .attr("xlink:href", (d) => d.icon || "/default-avatar.png");

    // ユーザー名を追加
    node
      .append("text")
      .attr("dy", 55)
      .attr("text-anchor", "middle")
      .attr("fill", "#9ca3af")
      .attr("font-size", "14px")
      .text((d) => d.username);

    // シミュレーションの更新処理
    simulation.on("tick", () => {
      link
        .attr(
          "x1",
          (d) =>
            (typeof d.source === "string"
              ? nodes.find((n) => n.id === d.source)?.x
              : (d.source as D3Node).x) ?? 0
        )
        .attr(
          "y1",
          (d) =>
            (typeof d.source === "string"
              ? nodes.find((n) => n.id === d.source)?.y
              : (d.source as D3Node).y) ?? 0
        )
        .attr(
          "x2",
          (d) =>
            (typeof d.target === "string"
              ? nodes.find((n) => n.id === d.target)?.x
              : (d.target as D3Node).x) ?? 0
        )
        .attr(
          "y2",
          (d) =>
            (typeof d.target === "string"
              ? nodes.find((n) => n.id === d.target)?.y
              : (d.target as D3Node).y) ?? 0
        );

      node.attr("transform", (d) => `translate(${d.x},${d.y})`);
    });

    // ドラッグ関連の関数
    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-gray-950">
      <svg ref={svgRef} className="w-full h-full" />
    </div>
  );
}
