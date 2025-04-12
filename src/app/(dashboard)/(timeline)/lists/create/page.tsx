//  app/(dashboard)/(timeline)/lists/create/page.tsx
// リスト作成ページ
import { Metadata } from "next";
import { ListForm } from "@/app/_components/ListForm";

export const metadata: Metadata = {
  title: "リストを作成",
  description: "新しいリストを作成します",
};

export default function CreateListPage() {
  return (
    <main className="container max-w-2xl py-4">
      <h1 className="mb-6 text-2xl font-bold">リストを作成</h1>
      <ListForm />
    </main>
  );
}
