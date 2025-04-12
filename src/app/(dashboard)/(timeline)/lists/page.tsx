// app/(dashboard)/(timeline)/lists/page.tsx
// リスト一覧ページ
import { Suspense } from "react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import ListsOfList from "@/app/_components/ListsOfList";
import Loading from "@/app/_components/Loading";

export const metadata = {
  title: "リスト一覧",
  description: "作成したリストや参加しているリストの一覧を表示します",
};

export default async function ListsPage() {
  const session = await getServerSession(authOptions);

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="container max-w-4xl py-4">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">リスト</h1>
          {session && (
            <Link href="/lists/create">
              <Button>
                <Plus className="mr-2 size-4" />
                新規作成
              </Button>
            </Link>
          )}
        </div>

        <div className="space-y-4">
          <Suspense fallback={<Loading />}>
            <ListsOfList />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
