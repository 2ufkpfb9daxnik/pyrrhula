-- Supabase SQL Editor で実行してください
-- rating_history.user_id を auth.users (UUID) から public.User (VARCHAR(16)) に合わせる

BEGIN;

-- 既存の外部キー制約があれば削除
ALTER TABLE public.rating_history
  DROP CONSTRAINT IF EXISTS rating_history_user_id_fkey;

-- 型を変更（既存データが UUID 形式でない場合のみ成功）
ALTER TABLE public.rating_history
  ALTER COLUMN user_id TYPE VARCHAR(16) USING user_id::text;

-- public.User への外部キー（任意・推奨）
ALTER TABLE public.rating_history
  ADD CONSTRAINT rating_history_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public."User"(user_id)
  ON DELETE CASCADE;

COMMIT;
