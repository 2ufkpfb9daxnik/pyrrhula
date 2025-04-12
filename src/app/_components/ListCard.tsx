import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "@/lib/formatDistanceToNow";

type ListCardProps = {
  list: {
    id: string;
    name: string;
    description: string | null;
    creator_id: string;
    is_managed: boolean;
    created_at: string;
    User: {
      username: string;
      icon: string | null;
    };
    _count: {
      list_members: number;
      list_followers: number;
      Post: number;
    };
  };
};

export default function ListCard({ list }: ListCardProps) {
  return (
    <Link href={`/lists/${list.id}`}>
      <Card className="p-4 transition-colors hover:bg-accent/50">
        <div className="flex gap-4">
          <Avatar className="size-12">
            <AvatarImage src={list.User.icon ?? undefined} />
            <AvatarFallback>{list.User.username[0]}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate font-bold">{list.name}</h3>
              {list.is_managed && (
                <span className="rounded bg-primary/10 px-2 py-0.5 text-xs text-primary">
                  管理リスト
                </span>
              )}
            </div>
            <p className="truncate text-sm text-muted-foreground">
              {list.description}
            </p>
            <div className="mt-2 text-sm text-muted-foreground">
              <span className="mr-4">メンバー {list._count.list_members}</span>
              <span className="mr-4">
                フォロワー {list._count.list_followers}
              </span>
              <span>投稿 {list._count.Post}</span>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              作成: {formatDistanceToNow(new Date(list.created_at))}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
