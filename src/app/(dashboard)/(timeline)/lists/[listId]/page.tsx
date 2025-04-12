//  app/(dashboard)/(timeline)/lists/[listId]/page.tsx
// リスト詳細・タイムラインページ
import { Suspense } from "react";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getList } from "@/app/_services/lists";
import Loading from "@/app/_components/Loading";
import { ListHeader } from "@/app/_components/ListHeader";
import { ListTimeline } from "@/app/_components/ListTimeline";
import { Button } from "@/components/ui/button";
import { Users, UserPlus } from "lucide-react";

interface Props {
  params: {
    listId: string;
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const list = await getList(params.listId);
  if (!list) return { title: "リストが見つかりません" };

  return {
    title: `${list.list.name} - Pyrrhula`,
    description: list.list.description || undefined,
  };
}

export default async function ListPage({ params }: Props) {
  const list = await getList(params.listId);
  if (!list) notFound();

  return (
    <main className="min-h-full border-x">
      <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="p-4">
          <h1 className="text-xl font-semibold">{list.list.name}</h1>
          {list.list.description && (
            <p className="mt-1 text-sm text-muted-foreground">
              {list.list.description}
            </p>
          )}

          <div className="mt-4 flex items-center gap-4">
            <Link href={`/lists/${list.list.id}/members`}>
              <Button variant="outline" size="sm" className="gap-2">
                <Users className="size-4" />
                {list.list._count?.members ?? 0}人のメンバー
              </Button>
            </Link>
            <Link href={`/lists/${list.list.id}/followers`}>
              <Button variant="outline" size="sm" className="gap-2">
                <UserPlus className="size-4" />
                {list.list._count?.followers ?? 0}人のフォロワー
              </Button>
            </Link>
            {list.list.isManaged && (
              <span className="text-sm text-muted-foreground">管理リスト</span>
            )}
          </div>
        </div>
      </div>

      <Suspense fallback={<Loading />}>
        <ListTimeline listId={params.listId} />
      </Suspense>
    </main>
  );
}
