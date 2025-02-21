# Pyrrhula - シンプルな分散型マイクロブログ

## TODO

- リプライ
- フォローグラフ
- 個別チャット
- プロフィール設定
- レート
- アイコン
- リアルタイム更新
- レスポンシブ対応
- 個人ページ

## 概要

Pyrrhulaは、シンプルさと使いやすさを重視した分散型マイクロブログプラットフォームです。手軽に情報発信や交流が行えます。

### 開発背景

既存のSNSプラットフォームには以下のような課題があると考えました：

- 過度に複雑化したUI/UX
- プライバシーへの懸念
- アルゴリズムによる情報の偏り

これらの課題を解決するため、以下の特徴を持つプラットフォームを開発しました：

- 直感的で分かりやすいUI
- ユーザーデータの透明性
- アルゴリズムに依存しない時系列タイムライン

### 公開URL

[Pyrrhula](https://pyrrhula.vercel.app)

## 特徴と機能

### 1. シンプルな認証システム

![認証画面](/screenshots/auth.png)

- ユーザーIDとパスワードのみで登録可能
- セキュアなJWT認証
- パスワードの暗号化保存

### 2. 直感的なタイムライン

![タイムライン](/screenshots/timeline.png)

- 時系列順の表示
- 無限スクロール
- レスポンシブデザイン

### 3. インタラクション機能

![インタラクション](/screenshots/interaction.png)

- お気に入り登録
- 投稿の拡散（リポスト）
- リプライチェーン

### 4. プロフィール管理

![プロフィール](/screenshots/profile.png)

<!-- - アイコン画像のアップロード -->

<!-- - プロフィール情報の編集 -->

- 投稿履歴の確認

### 5. 通知システム

![通知](/screenshots/notification.png)

<!-- - リアルタイム通知 -->

- アクション別の通知管理
- 既読/未読の状態管理

## 使用技術

### フロントエンド

- TypeScript 5.0
- Next.js 14 (App Router)
- TailwindCSS
- Radix UI
- ShadcnUI
- React Hot Toast

### バックエンド

- Next.js API Routes
- Prisma ORM
- PostgreSQL
- NextAuth.js

### 開発ツール

- Visual Studio Code
- Supabase (データベースホスティング)
- Vercel (デプロイ)
- Git/GitHub (バージョン管理)

### システム構成図

![システム構成図](/docs/architecture.png)

## 開発期間・体制

- 開発体制：個人開発
- 開発期間：2025.2 (約30時間)

## 工夫した点

- 意図的に投稿/アカウントの削除/編集機能を付けていません。今まで類似サービスを使ってきた経験からです。
- 意図的にユーザーIDは変更できませんし、決めることもできません。単にログイン機能としてのみ使われます。

## 既知の課題とTODO

### 課題

- 画像アップロード時のパフォーマンス改善
- プッシュ通知の実装
- 検索機能の強化

## リンク

- [2ufkpfbdaxnik](https://github.com/2ufkpfb9daxnik/pyrrhula)
- [ポートフォリオ](https://2ufkpfb9daxnik.github.io/portfolio/page/pyrrhula)
