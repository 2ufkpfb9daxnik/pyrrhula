import Link from "next/link";

export const metadata = {
  title: "利用規約",
};

export default function TermsPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-10 sm:px-6">
      <div className="mb-8 rounded-xl border border-border bg-card p-6">
        <h1 className="text-2xl font-bold">利用規約</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          本規約は、本サービス（SNS）を利用するすべてのユーザーに適用されます。
          本サービスに登録または利用した時点で、本規約に同意したものとみなします。
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          最終更新日: 2026年3月24日
        </p>
      </div>

      <div className="space-y-6">
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold">1. 公開範囲について</h2>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            本サービス上の情報は、パスワードを除き、すべて外部に公開される可能性があります。
            これには、投稿内容、チャット内容、フォロー・フォロワー関係、プロフィール、
            アイコン、ユーザー名、アカウント識別子、個別ID、その他ユーザーが設定可能・設定不可を問わず
            サービス上で扱われる一切の情報が含まれます。
          </p>
        </section>

        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold">2. データ変更・削除について</h2>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            運営は、理由の有無を問わず、ユーザー情報やコンテンツの削除、更新、非公開化、
            表示変更、アクセス制限その他の変更を行う場合があります。
            ユーザーはこれに同意するものとします。
          </p>
        </section>

        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold">3. 免責事項</h2>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            運営は本サービスの継続、完全性、安全性、正確性、有用性、特定目的適合性を保証しません。
            運営は、ユーザー間または第三者とのトラブル、データ消失、情報漏えい、
            利用不能、その他本サービスに関連して生じたいかなる損害についても責任を負いません。
          </p>
        </section>

        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold">4. 運営努力について</h2>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            運営はサービス維持に向けて最低限の努力を行いますが、
            その結果や継続提供を約束するものではありません。
          </p>
        </section>

        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold">5. 規約の変更</h2>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            本規約は運営の任意の判断により、予告なく変更される場合があります。変更後の規約は、
            本ページに掲載した時点から効力を生じます。
          </p>
        </section>
      </div>

      <div className="mt-8 flex items-center justify-between rounded-xl border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">
          登録または利用を継続する場合、本規約に同意したものとみなされます。
        </p>
        <Link
          href="/signup"
          className="text-sm font-medium text-primary hover:underline"
        >
          新規登録に戻る
        </Link>
      </div>
    </main>
  );
}
