import type { ListResponse } from "@/app/_types/list";

/**
 * リストの詳細情報を取得する
 */
export async function getList(listId: string): Promise<ListResponse | null> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/lists/${listId}`,
      {
        cache: "no-store",
      }
    );

    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error("リストの取得に失敗しました");
    }

    return res.json();
  } catch (error) {
    console.error("[リスト取得エラー]:", error);
    return null;
  }
}

/**
 * ユーザーのリスト一覧を取得する
 */
export async function getUserLists(userId: string): Promise<ListResponse[]> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/users/${userId}/lists`,
      {
        cache: "no-store",
      }
    );

    if (!res.ok) {
      throw new Error("リスト一覧の取得に失敗しました");
    }

    return res.json();
  } catch (error) {
    console.error("[リスト一覧取得エラー]:", error);
    return [];
  }
}
