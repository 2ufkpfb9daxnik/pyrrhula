"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, LoaderCircle, Send } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "@/lib/formatDistanceToNow"; // カスタム関数を使用

interface QuestionSender {
  id: string;
  username: string;
  icon: string | null;
}

interface QuestionDetail {
  id: string;
  question: string;
  answer: string | null;
  createdAt: string;
  answeredAt: string | null;
  status: string;
  senderId: string;
  targetUserId: string;
  sender: QuestionSender;
  targetUser: {
    id: string;
    username: string;
    icon: string | null;
  };
}

export default function QuestionDetailPage() {
  const params = useParams();
  const userId = typeof params?.userId === "string" ? params.userId : "";
  const questionId =
    typeof params?.questionId === "string" ? params.questionId : "";

  const [question, setQuestion] = useState<QuestionDetail | null>(null);
  const [answer, setAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: session } = useSession();
  const router = useRouter();

  // 質問の詳細データを取得
  useEffect(() => {
    if (!userId || !questionId) return;

    const fetchQuestionDetails = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(
          `/api/users/${userId}/questions/${questionId}`
        );

        if (!response.ok) {
          if (response.status === 404) {
            toast.error("質問が見つかりません");
            router.push(`/question/${userId}`);
            return;
          }
          throw new Error("質問の取得に失敗しました");
        }

        const data = await response.json();
        setQuestion(data);
      } catch (error) {
        console.error("Error fetching question:", error);
        toast.error("質問の読み込み中にエラーが発生しました");
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuestionDetails();
  }, [userId, questionId, router]);

  const handleSubmitAnswer = async () => {
    if (!answer.trim() || !question) {
      toast.error("回答を入力してください");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/users/${userId}/questions`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          questionId: question.id,
          answer,
          createPost: true, // 投稿も作成するオプション
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || "回答の送信に失敗しました");
      }

      // 成功したら質問オブジェクトを更新
      setQuestion({
        ...question,
        answer,
        answeredAt: new Date().toISOString(),
        status: "approved",
      });

      setAnswer("");
      toast.success("回答を送信しました");
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

  // 日付フォーマット用ヘルパー関数
  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString));
    } catch (e) {
      return "日付不明";
    }
  };

  // 質問が自分宛てかどうかをチェック
  const isOwnQuestion = session?.user?.id === userId;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoaderCircle className="size-20 animate-spin text-gray-500" />
      </div>
    );
  }

  if (!question) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <div className="rounded-lg border border-gray-800 p-8 text-center">
          <h2 className="mb-2 text-xl font-bold">質問が見つかりません</h2>
          <p className="text-gray-500">
            指定された質問は存在しないか、削除された可能性があります
          </p>
          <Link href={`/question/${userId}`} className="mt-4 inline-block">
            <Button variant="outline">質問一覧に戻る</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-4">
      {/* ヘッダー部分 */}
      <div className="mb-6 flex items-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/question/${userId}`)}
          className="mr-2"
        >
          <ArrowLeft className="size-5" />
        </Button>
        <h1 className="text-xl font-semibold">質問の詳細</h1>
      </div>

      {/* 質問カード */}
      <Card className="mb-6">
        <CardContent className="p-6">
          {/* 質問内容 */}
          <div className="mb-6 rounded-lg bg-gray-900 p-4">
            <p className="whitespace-pre-wrap text-gray-100">
              {question.question}
            </p>
          </div>

          {/* 回答表示エリア */}
          {question.answer ? (
            <div className="rounded-lg bg-gray-800/50 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Avatar className="size-8">
                  <AvatarImage src={question.targetUser.icon || undefined} />
                  <AvatarFallback>
                    {question.targetUser.username[0] || "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-gray-200">
                    {question.targetUser.username}
                  </p>
                  {question.answeredAt && (
                    <p className="text-xs text-gray-500">
                      {formatDate(question.answeredAt)}
                    </p>
                  )}
                </div>
              </div>
              <p className="whitespace-pre-wrap text-gray-100">
                {question.answer}
              </p>
            </div>
          ) : isOwnQuestion && session ? (
            // 未回答で質問の受信者かつログイン済みの場合
            <div className="mt-4 space-y-3">
              <h3 className="text-lg font-medium">回答を投稿</h3>
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
                className="min-h-32 w-full"
              />
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">Ctrl+Enter で送信</span>
                <Button
                  onClick={handleSubmitAnswer}
                  disabled={isSubmitting || !answer.trim()}
                >
                  {isSubmitting ? (
                    <LoaderCircle className="mr-2 size-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 size-4" />
                  )}
                  回答する
                </Button>
              </div>
            </div>
          ) : isOwnQuestion && !session ? (
            <div className="mt-4 rounded-lg border border-gray-800 p-4 text-center">
              <p className="mb-3 text-gray-400">
                この質問に回答するには
                <Link
                  href={`/login?redirect=/question/${userId}/${questionId}`}
                  className="mx-1 text-blue-400 hover:underline"
                >
                  ログイン
                </Link>
                が必要です
              </p>
              <Link href={`/login?redirect=/question/${userId}/${questionId}`}>
                <Button variant="outline">ログイン</Button>
              </Link>
            </div>
          ) : (
            <div className="mt-4 text-center text-gray-500">
              まだ回答がありません
            </div>
          )}
        </CardContent>
      </Card>

      {/* シェアボタン等の追加機能 */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => router.push(`/question/${userId}`)}
        >
          質問一覧に戻る
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            const url = `${window.location.origin}/question/${userId}/${questionId}`;
            navigator.clipboard.writeText(url);
            toast.success("リンクをコピーしました");
          }}
        >
          共有リンクをコピー
        </Button>
      </div>
    </div>
  );
}
