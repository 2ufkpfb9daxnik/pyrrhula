-- Supabase SQL Editor で実行してください
-- タイムライン・通知のリアルタイム更新（Realtime）を有効化する

-- 1. 対象テーブルを Realtime の publication に追加
--    （すでに追加済みの場合はエラーになることがあります。その行はスキップしてください）
ALTER PUBLICATION supabase_realtime ADD TABLE public."Post";
ALTER PUBLICATION supabase_realtime ADD TABLE public."Repost";
ALTER PUBLICATION supabase_realtime ADD TABLE public."Notification";

-- 2. Realtime が行の中身を送れるよう REPLICA IDENTITY を設定（推奨）
ALTER TABLE public."Post" REPLICA IDENTITY FULL;
ALTER TABLE public."Repost" REPLICA IDENTITY FULL;
ALTER TABLE public."Notification" REPLICA IDENTITY FULL;

-- 確認: Dashboard → Database → Publications → supabase_realtime に
-- Post / Repost / Notification が含まれていること
