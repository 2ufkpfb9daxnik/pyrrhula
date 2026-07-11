-- 任意: Realtime は接続できるがイベントが届かない場合のみ実行
-- RLS が有効なテーブルで anon 購読が弾かれるときの対策

DROP POLICY IF EXISTS "realtime_select_post" ON public."Post";
CREATE POLICY "realtime_select_post"
  ON public."Post"
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "realtime_select_repost" ON public."Repost";
CREATE POLICY "realtime_select_repost"
  ON public."Repost"
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "realtime_select_notification" ON public."Notification";
CREATE POLICY "realtime_select_notification"
  ON public."Notification"
  FOR SELECT
  TO anon, authenticated
  USING (true);
