"use client";

import { useEffect, useRef, useState } from "react";
import { Network, Node, Edge } from "vis-network";
import { DataSet } from "vis-data";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "@/lib/formatDistanceToNow";
import {
  Star,
  Users,
  Calendar,
  Trophy,
  ArrowRight,
  UserCircle,
  Share2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMediaQuery } from "@/app/_hooks/useMediaQuery";

interface UserNode {
  id: string;
  username: string;
  icon: string | null;
  followers: string[];
  following: string[];
  depth: number;
  children: UserNode[];
}

interface UserDetail {
  id: string;
  username: string;
  icon: string | null;
  profile: string | null;
  postCount: number;
  rate: number;
  createdAt: string;
  followersCount: number;
  followingCount: number;
}

interface NetworkGraphProps {
  graphData: UserNode;
  onNodeClick: (nodeId: string) => void;
}

// 深さごとの色を定義
const EDGE_DEPTH_COLORS = {
  1: "#ff4c4c", // 赤色（深さ1: 中心から直接つながる辺）
  2: "#ffcc29", // 黄色（深さ2: 間接的につながる辺）
  3: "#4688f1", // 青色（深さ3: さらに間接的につながる辺）
};

// 1ページあたりの表示ノード数
const NODES_PER_PAGE = 1000;

// 指数ページネーションコンポーネント
const PowerPagination: React.FC<{
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}> = ({ currentPage, totalPages, onPageChange }) => {
  const generatePowerPages = () => {
    const pages = new Set<number>();

    // 常に1ページ目を表示
    pages.add(1);

    // 現在のページを追加
    pages.add(currentPage);

    // 前のページ（2のべき乗分）
    let power = 1;
    while (currentPage - power >= 1) {
      pages.add(currentPage - power);
      power *= 2;
    }

    // 次のページ（2のべき乗分）
    while (currentPage + power <= totalPages) {
      pages.add(currentPage + power);
      power *= 2;
    }

    // 最後のページを追加（総ページ数が2以上の場合）
    if (totalPages > 1) {
      pages.add(totalPages);
    }

    return Array.from(pages).sort((a, b) => a - b);
  };

  const powerPages = generatePowerPages();

  return (
    <div className="flex flex-wrap justify-center gap-2 pt-4">
      {powerPages.map((page, index) => (
        <div key={`page-group-${page}`} className="flex items-center">
          {index > 0 && powerPages[index] - powerPages[index - 1] > 1 && (
            <span
              key={`ellipsis-${index}`}
              className="flex items-center px-2 text-gray-400"
            >
              ...
            </span>
          )}
          <Button
            key={page}
            variant={page === currentPage ? "default" : "outline"}
            size="sm"
            onClick={() => onPageChange(page)}
            className="min-w-[40px]"
          >
            {page}
          </Button>
        </div>
      ))}
    </div>
  );
};

export default function NetworkGraph({
  graphData,
  onNodeClick,
}: NetworkGraphProps) {
  const networkRef = useRef<HTMLDivElement>(null);
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [allNodes, setAllNodes] = useState<UserNode[]>([]);
  const isMobile = useMediaQuery("(max-width: 768px)");

  // ユーザー詳細情報を取得する関数
  const fetchUserDetails = async (userId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/users/${userId}?type=profile`);
      if (!response.ok) {
        throw new Error("ユーザー情報の取得に失敗しました");
      }
      const data = await response.json();
      setSelectedUser(data);
    } catch (error) {
      console.error("Error fetching user details:", error);
    } finally {
      setLoading(false);
    }
  };

  // ノードを収集する関数
  const collectNodes = (rootNode: UserNode): UserNode[] => {
    const result: UserNode[] = [];
    const visited = new Set<string>();

    const traverse = (node: UserNode, depth: number) => {
      if (visited.has(node.id) || depth > 3) return;

      visited.add(node.id);
      result.push(node);

      node.children.forEach((child) => {
        if (
          node.following.includes(child.id) ||
          node.followers.includes(child.id)
        ) {
          traverse(child, depth + 1);
        }
      });
    };

    traverse(rootNode, 0);
    return result;
  };

  // ページに基づいてノードをフィルタリングする関数
  const getNodesForPage = (nodes: UserNode[], page: number): UserNode[] => {
    const start = (page - 1) * NODES_PER_PAGE;
    // 中心ノードを常に含める
    const centralNode = nodes.find((n) => n.id === graphData.id);
    const otherNodes = nodes
      .filter((n) => n.id !== graphData.id)
      .slice(start, start + NODES_PER_PAGE - 1);

    return centralNode ? [centralNode, ...otherNodes] : otherNodes;
  };

  // ページを変更する関数
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    renderGraph(getNodesForPage(allNodes, page));
  };

  // グラフを描画する関数
  const renderGraph = (nodeSet: UserNode[]) => {
    if (!networkRef.current) return;

    import("vis-network").then(({ Network }) => {
      import("vis-data").then(({ DataSet }) => {
        // ノードとエッジのデータセットを作成
        const nodes = new DataSet<Node>();
        const edges = new DataSet<Edge>();
        const processedNodes = new Set<string>();
        const centralUserId = graphData.id; // 中心ユーザーのID

        // ノード集合からグラフを生成
        nodeSet.forEach((user) => {
          if (processedNodes.has(user.id)) return;
          processedNodes.add(user.id);

          // ノードを追加
          nodes.add({
            id: user.id,
            label: user.username,
            shape: "circularImage",
            image: user.icon || "/default-avatar.png",
            size: user.id === centralUserId ? 50 : 40 - (user.depth || 0) * 5,
            borderWidth: 3,
            borderColor: user.id === centralUserId ? "#4CAF50" : "#2196F3",
            brokenImage: "/default-avatar.png",
            depth: user.depth || 0,
            title: `${user.username}\n@${user.id}`,
          } as Node);

          // フォロー関係のエッジを追加
          user.following.forEach((targetId) => {
            // 表示されているノードのみエッジを追加
            if (nodeSet.some((n) => n.id === targetId)) {
              const edgeDepth = (user.depth || 0) + 1;
              const edgeColor =
                edgeDepth <= 3
                  ? EDGE_DEPTH_COLORS[
                      edgeDepth as keyof typeof EDGE_DEPTH_COLORS
                    ]
                  : "#666666";

              edges.add({
                from: user.id,
                to: targetId,
                arrows: "to",
                color: { color: edgeColor, opacity: 0.8 },
                width: Math.max(2.5 - edgeDepth * 0.5, 1),
                title: `${user.username} → ${targetId}`,
                edgeDepth: edgeDepth,
              } as Edge);
            }
          });
        });

        // ネットワークの設定
        const options = {
          physics: {
            stabilization: {
              iterations: 100,
              fit: true,
            },
            barnesHut: {
              gravitationalConstant: -80000,
              springConstant: 0.001,
              springLength: 200,
              avoidOverlap: 0.5,
            },
          },
          interaction: {
            navigationButtons: true,
            keyboard: true,
            hover: true,
            tooltipDelay: 200,
            zoomView: true,
          },
          nodes: {
            font: {
              size: 16,
              color: "#ffffff",
              strokeWidth: 2,
              strokeColor: "#000000",
            },
          },
          edges: {
            smooth: {
              enabled: true,
              type: "continuous",
              forceDirection: "none",
              roundness: 0.5,
            },
            font: {
              size: 10,
              align: "middle",
              color: "#ffffff",
            },
          },
          layout: {
            improvedLayout: true,
            hierarchical: {
              enabled: false,
            },
          },
        };

        // 既存のネットワークを破棄
        if (networkRef.current) {
          while (networkRef.current.firstChild) {
            networkRef.current.removeChild(networkRef.current.firstChild);
          }
        }

        // ネットワークを作成
        const network = new Network(
          networkRef.current!,
          { nodes, edges },
          options
        );

        // クリックイベントの処理
        network.on("click", async (params) => {
          if (params.nodes.length > 0) {
            const nodeId = params.nodes[0].toString();
            await fetchUserDetails(nodeId);
          } else {
            setSelectedUser(null);
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

        // 初期ズームレベルとフォーカスを設定
        setTimeout(() => {
          network.fit({
            animation: {
              duration: 1000,
              easingFunction: "easeOutQuad",
            },
          });
        }, 500);
      });
    });
  };

  useEffect(() => {
    if (typeof window !== "undefined" && networkRef.current) {
      // 全ノードを収集
      const nodes = collectNodes(graphData);
      setAllNodes(nodes);

      // 総ページ数を計算
      const calculatedTotalPages = Math.ceil(nodes.length / NODES_PER_PAGE);
      setTotalPages(calculatedTotalPages);

      // 初期ページのノードでグラフを描画
      renderGraph(getNodesForPage(nodes, currentPage));
    }

    return () => {
      setSelectedUser(null);
    };
  }, [graphData]);

  // レート値に応じた色を生成
  const getRateColor = (rate: number): string => {
    if (rate >= 1000) return "text-purple-500";
    if (rate >= 500) return "text-blue-500";
    if (rate >= 100) return "text-green-500";
    if (rate >= 50) return "text-yellow-500";
    return "text-gray-400";
  };

  // ユーザーウィジェットの表示
  const renderUserWidget = (user: UserDetail) => (
    <Card
      className={`z-10 bg-gray-950/90 text-white shadow-xl ${isMobile ? "fixed bottom-40 left-4 right-4" : "absolute left-4 top-4 max-w-md"}`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center">
            <Avatar className="mr-3 size-12 border-2 border-primary">
              <AvatarImage src={user.icon || undefined} alt={user.username} />
              <AvatarFallback className="text-lg">
                {user.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="flex items-center">
                <span className={`font-bold ${getRateColor(user.rate)}`}>
                  {user.username}
                </span>
                <Badge variant="outline" className="ml-2 text-xs">
                  @{user.id}
                </Badge>
              </CardTitle>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-400">
                <span className="flex items-center">
                  <Calendar className="mr-1 size-3" />
                  {formatDistanceToNow(new Date(user.createdAt))}に参加
                </span>
                <span className="flex items-center">
                  <Trophy className="mr-1 size-3" />
                  レート: {user.rate}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-2">
        {user.profile && (
          <p className="mb-3 whitespace-pre-wrap text-sm">{user.profile}</p>
        )}

        <div className="mt-2 grid grid-cols-3 gap-3 text-center text-xs">
          <div className="rounded-md bg-gray-800/50 p-2">
            <div className="font-medium text-gray-300">投稿</div>
            <div className="mt-1 text-sm font-semibold">{user.postCount}</div>
          </div>
          <div className="rounded-md bg-gray-800/50 p-2">
            <div className="font-medium text-gray-300">フォロワー</div>
            <div className="mt-1 text-sm font-semibold">
              {user.followersCount}
            </div>
          </div>
          <div className="rounded-md bg-gray-800/50 p-2">
            <div className="font-medium text-gray-300">フォロー中</div>
            <div className="mt-1 text-sm font-semibold">
              {user.followingCount}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // アクションボタンの表示
  const renderActionButtons = (user: UserDetail) => (
    <div
      className={`z-10 ${
        isMobile
          ? "fixed bottom-20 left-4 right-4 flex flex-col gap-2" // bottom-4 から bottom-20 に変更
          : "absolute bottom-4 left-1/2 flex -translate-x-1/2 transform justify-center gap-3"
      }`}
    >
      <Button
        variant="default"
        className="flex w-full items-center justify-center gap-2"
        onClick={() => onNodeClick(user.id)}
      >
        <UserCircle size={18} />
        プロフィール
      </Button>

      <Button
        variant="outline"
        className="flex w-full items-center justify-center gap-2 bg-gray-900 text-white hover:bg-gray-800"
        onClick={() => window.open(`/followgraph/${user.id}`, "_blank")}
      >
        <Share2 size={18} />
        フォローグラフ
      </Button>
    </div>
  );

  // ページネーションを表示する必要があるか
  const needsPagination = totalPages > 1;

  return (
    <div className="relative size-full" style={{ background: "#0a0a0a" }}>
      {/* グラフの凡例 */}
      <div
        className={`z-10 rounded bg-gray-900/80 p-3 text-white shadow-lg ${
          isMobile
            ? "absolute left-4 top-4 max-w-[calc(100%-2rem)]"
            : "absolute right-4 top-4"
        }`}
      >
        <h3 className="mb-2 font-bold">関係の深さ</h3>
        <div className="space-y-2 text-xs">
          <div className="flex items-center">
            <span
              className="mr-2 inline-block h-3 w-6"
              style={{ backgroundColor: EDGE_DEPTH_COLORS[1] }}
            ></span>
            <span>そのユーザーのフォロイー</span>
          </div>
          <div className="flex items-center">
            <span
              className="mr-2 inline-block h-3 w-6"
              style={{ backgroundColor: EDGE_DEPTH_COLORS[2] }}
            ></span>
            <span>2次のつながり</span>
          </div>
          <div className="flex items-center">
            <span
              className="mr-2 inline-block h-3 w-6"
              style={{ backgroundColor: EDGE_DEPTH_COLORS[3] }}
            ></span>
            <span>3次のつながり</span>
          </div>
        </div>
      </div>

      {/* 選択されたユーザーの詳細情報 */}
      {selectedUser && renderUserWidget(selectedUser)}

      {/* アクションボタン */}
      {selectedUser && renderActionButtons(selectedUser)}

      {/* グラフ描画エリア */}
      <div ref={networkRef} className="size-full" />

      {/* ページネーション */}
      {needsPagination && (
        <div
          className={`z-10 bg-gray-900/80 p-2 text-white ${
            isMobile
              ? "fixed bottom-0 left-0 right-0"
              : "absolute bottom-4 left-1/2 -translate-x-1/2 transform rounded"
          }`}
        >
          <PowerPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}

      {/* 使い方ヒント */}
      {!selectedUser && !isMobile && (
        <div className="absolute bottom-20 right-4 z-10 rounded bg-gray-900/60 p-2 text-xs text-gray-200">
          <p>アイコン押してユーザー詳細</p>
          <p>背景押して選択解除</p>
          <p>ホイールとか指で拡大縮小</p>
        </div>
      )}
    </div>
  );
}
