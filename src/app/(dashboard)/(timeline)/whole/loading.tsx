export default function WholeLoading() {
  return (
    <div className="mx-auto max-w-2xl p-4">
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse border-b border-gray-700 px-3 py-4"
          >
            <div className="flex items-start space-x-2.5">
              {/* アバタースケルトン */}
              <div className="size-9 shrink-0 rounded-full bg-gray-800" />
              <div className="flex-1 space-y-2">
                {/* ユーザー名スケルトン */}
                <div className="h-3 w-24 rounded bg-gray-800" />
                {/* 投稿本文スケルトン */}
                <div className="space-y-1.5">
                  <div className="h-3 w-full rounded bg-gray-800" />
                  <div className="h-3 w-4/5 rounded bg-gray-800" />
                </div>
                {/* アクションボタンスケルトン */}
                <div className="flex space-x-4 pt-1">
                  <div className="h-3 w-8 rounded bg-gray-800" />
                  <div className="h-3 w-8 rounded bg-gray-800" />
                  <div className="h-3 w-8 rounded bg-gray-800" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
