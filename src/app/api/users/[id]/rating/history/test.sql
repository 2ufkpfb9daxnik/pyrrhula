-- テスト用のレート履歴データを挿入
INSERT INTO rating_history (user_id, delta, rating, reason)
VALUES 
  ('testuser', 10, 10, 'Initial rating'),
  ('testuser', 5, 15, 'Good post'),
  ('testuser', -3, 12, 'Poor interaction'),
  ('testuser', 8, 20, 'Excellent contribution'),
  ('testuser', -2, 18, 'Minor issue');