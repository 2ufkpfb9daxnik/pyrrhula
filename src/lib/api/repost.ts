/** タイムライン API で使用する拡散行の型 */
export interface RepostWithPost {
  id: string;
  createdAt: Date;
  userId: string;
  postId: string;
  user: {
    id: string;
    username: string;
    icon: string | null;
  };
  post: {
    id: string;
    content: string;
    createdAt: Date;
    favorites: number;
    reposts: number;
    images: string[];
    user: {
      id: string;
      username: string;
      icon: string | null;
    };
    parent: {
      id: string;
      content: string;
      user?: {
        id: string;
        username: string;
      };
    } | null;
    _count: {
      replies: number;
    };
    Question: {
      id: string;
      question: string;
      answer: string | null;
      targetUserId: string;
      User_Question_targetUserIdToUser: {
        username: string;
        icon: string | null;
      };
    }[];
  };
}

export interface TimelineQuestion {
  id: string;
  question: string;
  answer: string | null;
  targetUserId: string;
  targetUser: {
    username: string;
    icon: string | null;
  };
}

export function extractQuestion(
  questions: RepostWithPost["post"]["Question"],
): TimelineQuestion | undefined {
  if (!questions || questions.length === 0) return undefined;
  const q = questions[0];
  return {
    id: q.id,
    question: q.question,
    answer: q.answer,
    targetUserId: q.targetUserId,
    targetUser: {
      username: q.User_Question_targetUserIdToUser.username,
      icon: q.User_Question_targetUserIdToUser.icon,
    },
  };
}
