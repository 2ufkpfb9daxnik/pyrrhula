"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useInterval } from "@/app/_hooks/useInterval";
import { Plus, RefreshCw, LoaderCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

// 質問の型定義
interface QuestionSender {
  id: string;
  username: string;
  icon: string | null;
}

interface Question {
  id: string;
  question: string;
  answer: string | null;
  createdAt: string;
  answeredAt: string | null;
  status: string;
  targetUserId: string;
}

interface QuestionResponse {
  questions: Question[];
  hasMore: boolean;
  nextCursor?: string;
}

interface UserInfo {
  icon: string | null;
  username: string;
  id: string;
}

// QuestionItemコンポーネント
const QuestionItem = ({
  question,
  onAnswerSuccess,
  isOwner,
  targetUserId,
  userInfo,
}: {
  question: Question;
  onAnswerSuccess?: (questionId: string, answer: string) => void;
  isOwner: boolean;
  targetUserId: string;
  userInfo: UserInfo | null;
}) => {
  const [answer, setAnswer] = useState("");
  const [showAnswerForm, setShowAnswerForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: session } = useSession();
  const router = useRouter();

  const handleSubmitAnswer = async () => {
    if (!answer.trim()) {
      toast.error("回答を入力してください");
      return;
    }

    setIsSubmitting(true);
    try {
      // targetUserIdを直接使用
      const response = await fetch(`/api/users/${targetUserId}/questions`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          questionId: question.id,
          answer,
          createPost: true,
        }),
      });

      // より詳細なデバッグ情報
      console.log("回答リクエスト - ステータス:", response.status);
      const responseData = await response.json();
      console.log("回答レスポンス:", responseData);

      if (!response.ok) {
        throw new Error(responseData.error || "回答の送信に失敗しました");
      }

      toast.success("回答を送信しました");
      setShowAnswerForm(false);
      if (onAnswerSuccess) {
        onAnswerSuccess(question.id, answer);
      }
    } catch (error) {
      console.error("Error submitting answer:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "回答の送信中にエラーが発生しました"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuestionClick = (
    event: React.MouseEvent<HTMLDivElement, MouseEvent>
  ) => {
    // Prevent navigation if clicking on a link or button
    if (
      event.target instanceof HTMLButtonElement ||
      event.target instanceof HTMLAnchorElement ||
      (event.target as HTMLElement).closest("button") ||
      (event.target as HTMLElement).closest("a")
    ) {
      return;
    }

    router.push(`/question/${targetUserId}/${question.id}`);
  };

  return (
    <div
      className="cursor-pointer rounded-lg border border-gray-800 p-4"
      onClick={handleQuestionClick}
    >
      {/* 質問日時のみ表示（質問者情報は表示しない） */}
      <div className="mb-2">
        <p className="text-xs text-gray-500">
          {new Date(question.createdAt).toLocaleDateString()}に質問
        </p>
      </div>

      {/* 質問内容 */}
      <div className="mb-4 rounded bg-gray-900 p-3">
        <p className="text-gray-200">{question.question}</p>
      </div>

      {question.answer ? (
        // 回答済み - ユーザーアイコン付きの回答表示に変更
        <div className="rounded bg-gray-800/50 p-3">
          <div className="mb-2 flex items-center gap-2">
            <Avatar className="size-6">
              <AvatarImage src={userInfo?.icon || undefined} />
              <AvatarFallback>{userInfo?.username?.[0] || "?"}</AvatarFallback>
            </Avatar>
            <div>
              <span className="text-sm font-medium text-gray-200">
                {userInfo?.username || "回答者"}
              </span>
            </div>
          </div>
          <p className="text-gray-100">{question.answer}</p>
          {question.answeredAt && (
            <p className="mt-2 text-right text-xs text-gray-500">
              {new Date(question.answeredAt).toLocaleDateString()}
            </p>
          )}
        </div>
      ) : isOwner && session ? (
        // 未回答で質問の受信者かつログイン済みの場合
        showAnswerForm ? (
          <div className="mt-2 space-y-2" onClick={(e) => e.stopPropagation()}>
            <Textarea
              placeholder="回答を入力..."
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                  e.preventDefault();
                  if (answer.trim() && !isSubmitting) {
                    handleSubmitAnswer();
                  }
                }
              }}
              className="min-h-24 w-full"
            />
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">Ctrl+Enter で送信</span>
              <div className="flex gap-2">
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSubmitAnswer();
                  }}
                  disabled={isSubmitting || !answer.trim()}
                >
                  {isSubmitting ? (
                    <LoaderCircle className="mr-2 size-4 animate-spin" />
                  ) : null}
                  回答する
                </Button>
                <Button
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAnswerForm(false);
                  }}
                >
                  キャンセル
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              setShowAnswerForm(true);
            }}
            className="w-full"
          >
            回答する
          </Button>
        )
      ) : isOwner && !session ? (
        // 未回答で質問の受信者だがログインしていない場合
        <div className="rounded bg-gray-800/20 p-3 text-center">
          <p className="mb-2 text-sm text-gray-400">
            この質問に回答するには、ログインが必要です
          </p>
          <Link href="/login" onClick={(e) => e.stopPropagation()}>
            <Button variant="outline" size="sm">
              ログイン
            </Button>
          </Link>
        </div>
      ) : (
        // 未回答で質問の受信者でない場合
        <p className="text-center text-sm text-gray-500">
          まだ回答がありません
        </p>
      )}
    </div>
  );
};

// 質問入力コンポーネント
const AskQuestion = ({
  targetUserId,
  onQuestionSent,
  inputRef,
  noBorder = false,
}: {
  targetUserId: string;
  onQuestionSent: () => void;
  inputRef?: React.RefObject<HTMLTextAreaElement>;
  noBorder?: boolean;
}) => {
  const [question, setQuestion] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!question.trim()) {
      toast.error("質問を入力してください");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/users/${targetUserId}/questions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "質問の送信に失敗しました");
      }

      setQuestion("");
      toast.success("質問を送信しました");
      onQuestionSent();
    } catch (error) {
      console.error("Error submitting question:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "質問の送信中にエラーが発生しました"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Ctrl+Enter で送信できるようにするハンドラー
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      if (question.trim() && !isSubmitting) {
        handleSubmit();
      }
    }
  };

  return (
    <div
      className={`${noBorder ? "p-4" : "rounded-lg border border-gray-800 p-4"}`}
    >
      <Textarea
        ref={inputRef}
        placeholder="500文字まで"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        onKeyDown={handleKeyDown}
        className="mb-3 min-h-24"
        maxLength={500}
      />
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs text-gray-500">{question.length}/500</span>
          <span className="ml-2 text-xs text-gray-500">Ctrl+Enter で送信</span>
        </div>
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || !question.trim()}
        >
          {isSubmitting ? (
            <LoaderCircle className="mr-2 size-4 animate-spin" />
          ) : null}
          質問
        </Button>
      </div>
    </div>
  );
};

// ログイン促進コンポーネント
const LoginPrompt = ({ targetUserId }: { targetUserId: string }) => {
  return (
    <div className="mb-6 rounded-lg border border-gray-800 p-4 text-center">
      <p className="mb-3 text-gray-400">
        質問するには
        <Link href="/login" className="mx-1 text-blue-400 hover:underline">
          ログイン
        </Link>
        が必要です
      </p>
      <Link href={`/login?redirect=/question/${targetUserId}`}>
        <Button variant="outline">ログイン</Button>
      </Link>
    </div>
  );
};

export default function QuestionPage() {
  const params = useParams();
  const userId = typeof params?.userId === "string" ? params.userId : "";

  const [questions, setQuestions] = useState<Question[]>([]);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { data: session } = useSession();
  const router = useRouter();
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const questionInputRef = useRef<HTMLTextAreaElement>(null);
  const [activeTab, setActiveTab] = useState("all");

  // 更新間隔は質問では長めに設定（ログインしている場合のみ）
  useInterval(() => {
    if (session) {
      fetchLatestQuestions();
    }
  }, 300000); // 5分ごと

  // 新しい質問のみを取得する関数
  const fetchLatestQuestions = async () => {
    if (!userId) return;

    try {
      const filter =
        activeTab === "answered"
          ? "answered=true"
          : activeTab === "unanswered"
            ? "unanswered=true"
            : "";

      const response = await fetch(`/api/users/${userId}/questions?${filter}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("新しい質問の取得に失敗しました");
      }

      const data: QuestionResponse = await response.json();

      if (data.questions.length > 0) {
        setQuestions((prev) => {
          // 既存の質問と比較して新しいものだけを取得
          const existingIds = new Set(prev.map((q) => q.id));
          const newQuestions = data.questions.filter(
            (q) => !existingIds.has(q.id)
          );

          if (newQuestions.length > 0) {
            return [...newQuestions, ...prev];
          }
          return prev;
        });
      }
    } catch (error) {
      console.error("Error fetching new questions:", error);
    }
  };

  // 初回読み込み時 - ログインの有無に関わらず実行
  useEffect(() => {
    if (!userId) return;
    setIsLoading(true);

    Promise.all([fetchUserInfo(), fetchQuestions()]).finally(() => {
      setIsLoading(false);
    });
  }, [userId, activeTab]);

  // キーボードショートカット - ログイン時のみ有効
  useEffect(() => {
    if (!session) return;

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
            questionInputRef.current?.focus();
          }, 100);
        } else {
          questionInputRef.current?.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [session]);

  const fetchUserInfo = async () => {
    if (!userId) return;

    try {
      setError(null);
      const response = await fetch(`/api/users/${userId}`, {
        next: { revalidate: 300 }, // 5分間キャッシュ
      });

      if (!response.ok) {
        throw new Error("ユーザー情報の取得に失敗しました");
      }

      const data = await response.json();

      if (!data || !data.id) {
        throw new Error("ユーザーが見つかりませんでした");
      }

      setUserInfo(data);
      return data;
    } catch (error) {
      console.error("Error fetching user info:", error);
      setError(
        error instanceof Error
          ? error.message
          : "ユーザー情報の取得に失敗しました"
      );
      return null;
    }
  };

  const fetchQuestions = async (cursor?: string) => {
    if (!userId) return;

    try {
      const params = new URLSearchParams();
      if (cursor) {
        params.append("cursor", cursor);
      }

      // タブに応じて質問をフィルタリング
      if (activeTab === "answered") {
        params.append("answered", "true");
      } else if (activeTab === "unanswered") {
        params.append("unanswered", "true");
      }

      const response = await fetch(`/api/users/${userId}/questions?${params}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("質問の取得に失敗しました");
      }

      const data: QuestionResponse = await response.json();

      if (cursor) {
        // 追加読み込み
        setQuestions((prev) => [...prev, ...data.questions]);
      } else {
        // 初回読み込み
        setQuestions(data.questions);
      }

      setHasMore(data.hasMore);
      setNextCursor(data.nextCursor);
      return data;
    } catch (error) {
      console.error("Error fetching questions:", error);
      setError(
        error instanceof Error
          ? error.message
          : "質問の読み込み中にエラーが発生しました"
      );
      return null;
    }
  };

  const handleAnswerSuccess = (questionId: string, answer: string) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId
          ? {
              ...q,
              answer,
              answeredAt: new Date().toISOString(),
              status: "approved",
            }
          : q
      )
    );
  };

  // 再読み込みハンドラー
  const handleRetry = () => {
    setIsLoading(true);
    setError(null);

    Promise.all([fetchUserInfo(), fetchQuestions()]).finally(() => {
      setIsLoading(false);
    });
  };

  // ローディング表示
  if (isLoading && questions.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoaderCircle className="size-20 animate-spin text-gray-500" />
      </div>
    );
  }

  // エラー表示
  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <div className="max-w-md rounded-lg border border-red-800 bg-red-900/20 p-8 text-center">
          <h2 className="mb-2 text-xl font-bold text-red-400">
            エラーが発生しました
          </h2>
          <p className="mb-4 text-gray-300">{error}</p>
          <Button onClick={handleRetry} variant="outline">
            再読み込み
          </Button>
        </div>
      </div>
    );
  }

  // ユーザーが見つからない場合
  if (!isLoading && !userInfo) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <div className="rounded-lg border border-gray-800 p-8 text-center">
          <h2 className="mb-2 text-xl font-bold">ユーザーが見つかりません</h2>
          <p className="text-gray-500">
            指定されたユーザーIDの質問は存在しないか、削除された可能性があります
          </p>
          <Link href="/" className="mt-4 inline-block">
            <Button variant="outline">トップページに戻る</Button>
          </Link>
        </div>
      </div>
    );
  }

  const isCurrentUser = session?.user?.id === userId;

  return (
    <>
      <div className="flex flex-1 justify-center pb-16 md:pb-0">
        <div className="w-full max-w-2xl p-4">
          {/* ユーザー情報ヘッダー */}
          {userInfo && (
            <div className="mb-6 flex flex-col items-center justify-center text-center">
              <Avatar className="mb-2 size-20">
                <AvatarImage src={userInfo.icon ?? undefined} />
                <AvatarFallback>{userInfo.username?.[0] || "?"}</AvatarFallback>
              </Avatar>
              <h1 className="text-2xl font-bold">{userInfo.username}</h1>
              <p className="text-sm text-gray-500">@{userInfo.id}</p>
              <div className="mt-2">
                <Link href={`/user/${userInfo.id}`}>
                  <Button variant="outline" size="sm">
                    プロフィール
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* 質問フォーム（自分宛てでない場合のみ表示、ログインの有無で表示を変える） */}
          {!isCurrentUser && (
            <div className="mb-6">
              {session ? (
                <AskQuestion
                  targetUserId={userId}
                  onQuestionSent={fetchLatestQuestions}
                  inputRef={questionInputRef}
                />
              ) : (
                <LoginPrompt targetUserId={userId} />
              )}
            </div>
          )}

          {/* タブナビゲーション */}
          <Tabs
            defaultValue="all"
            className="mb-6"
            value={activeTab}
            onValueChange={(value) => {
              setActiveTab(value);
            }}
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">すべての質問</TabsTrigger>
              <TabsTrigger value="answered">回答済み</TabsTrigger>
              <TabsTrigger value="unanswered">未回答</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* 質問一覧 */}
          <div className="space-y-4">
            {questions.length === 0 ? (
              <div className="rounded-lg border border-gray-800 p-8 text-center">
                <p className="text-gray-500">
                  {activeTab === "all"
                    ? "まだ質問がありません。"
                    : activeTab === "answered"
                      ? "回答済みの質問がありません。"
                      : "未回答の質問がありません。"}
                </p>
              </div>
            ) : (
              <>
                {questions.map((question) => (
                  <QuestionItem
                    key={question.id}
                    question={question}
                    onAnswerSuccess={handleAnswerSuccess}
                    isOwner={isCurrentUser}
                    targetUserId={userId}
                    userInfo={userInfo}
                  />
                ))}
              </>
            )}

            {/* もっと読み込むボタン */}
            {hasMore && (
              <div className="flex justify-center py-4">
                <Button
                  variant="outline"
                  onClick={() => fetchQuestions(nextCursor)}
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

      {/* // モバイル用質問ボタン */}
      {!isCurrentUser &&
        (session ? (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                className="fixed bottom-20 right-4 size-14 rounded-full p-0 shadow-lg md:hidden"
                variant="default"
              >
                <Plus className="size-6" />
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[calc(100%-32px)] max-w-[425px] p-0 pt-6">
              <DialogTitle className="sr-only">新しい質問を投稿</DialogTitle>
              <AskQuestion
                targetUserId={userId}
                onQuestionSent={() => {
                  fetchLatestQuestions();
                  setIsDialogOpen(false);
                }}
                inputRef={questionInputRef}
                noBorder={true}
              />
            </DialogContent>
          </Dialog>
        ) : (
          <Link href={`/login?redirect=/question/${userId}`}>
            <Button
              className="fixed bottom-20 right-4 size-14 rounded-full p-0 shadow-lg md:hidden"
              variant="default"
            >
              <Plus className="size-6" />
            </Button>
          </Link>
        ))}
    </>
  );
}
