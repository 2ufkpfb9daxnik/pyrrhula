# 鷽(ウソ)

レートのあるSNS

## TODO

- フォローグラフ原因究明
- 楽観的実行
- 拡散について検証
- 色々コンポーネント化して使いやすく
- レート取得タイミングを適正化
- タイムライン/通知/チャット自動更新

## 概要

鷽は、シンプルさと使いやすさを重視したレートのあるSNSです。手軽に情報発信や交流が行えます。

### 開発背景

既存のSNSプラットフォームには以下のような課題があると考えました：

- 過度に複雑化したUI/UX
- プライバシーへの懸念
- アルゴリズムによる情報の偏り

また、以下のような機能があると面白いと考えました：

- 投稿数に応じたレーティングシステム
  - ユーザーの活動度が一目で分かる
  - 投稿のモチベーション向上につながる
- 全体タイムライン
  - アカウント作成直後から好みの投稿者を見つけやすい
  - アルゴリズムに依存せず多様な投稿に触れられる
- フォローグラフ
  - ユーザー間のつながりを視覚的に把握
  - 好みの投稿者に近いユーザーの発見が容易

これらの課題を解決し、新しい機能を実現するため、以下の特徴を持つプラットフォームを開発しました：

- 直感的で分かりやすいUI
- ユーザーデータの透明性
- アルゴリズムに依存しない時系列タイムライン
- レーティング、全体タイムライン、フォローグラフが存在

### 公開URL

[鷽](https://pyrrhula.vercel.app)

## 特徴と機能

### 1. シンプルな認証システム

![認証画面](/screenshots/auth.png)

- ユーザーIDとパスワードのみでログイン可能
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

### 4. プロフィール

![プロフィール](/screenshots/profile.png)

<!-- - アイコン画像のアップロード -->

- プロフィール情報の編集

- 投稿履歴の確認

### 5. 通知システム

![通知](/screenshots/notification.png)

<!-- - リアルタイム通知 -->

- アクション別の通知管理
- 既読/未読の状態管理

## 6. 全体タイムライン

フォローしている人のもしていない人のも全部流れてくるタイムラインがあります

## 7. チャット

それぞれのユーザーたちと自由にチャットできます

![チャット](/screenshots/chat.png)

グループチャットもあります。

![グループチャット](/screenshots/groupchat.png)

## 8. フォローグラフ(現状vercelで動きません 原因究明中)

フォロー/フォロワー関係にある人たちをグラフで表します。矢印で指されている人がフォローされている人です。

![フォローグラフ](/screenshots/followgraph.png)

## 9. レーティング

投稿頻度などによってレーティングがつき、それぞれに対応する色が名前に反映されます

![レーティング](/screenshots/rating.png)

## 10. ハッシュタグ

ハッシュタグを付けるとそのワードで簡単に検索できます

![ハッシュタグ](/screenshots/hashtag.png)

## 10. レスポンシブ対応

これらの全ての機能について、スマートフォンなどで見たときに表示が適したものになるようになっています

![レスポンシブ対応](/screenshots/responsibe.png)

## 使用技術

## システム構成図

```mermaid
graph TB
    subgraph Client
        Browser[ブラウザー]
        NextJS[Next.js App]
        React[React Components]
        Auth[NextAuth.js]
    end

    subgraph Server
        API[Next.js API Routes]
        Prisma[Prisma ORM]
        Cache[Next.js Cache]
    end

    subgraph Database
        Supabase[Supabase PostgreSQL]
    end

    subgraph External
        GitHub[GitHub OAuth]
        Vercel[Vercel Platform]
        CDN[Vercel Edge Network]
    end

    Browser --> NextJS
    NextJS --> React
    NextJS --> Auth
    Auth --> GitHub
    API --> Prisma
    NextJS --> Cache
    Cache --> CDN
    NextJS --> Vercel

    classDef primary fill:#ff9900,stroke:#333,stroke-width:2px;
    classDef secondary fill:#00ff99,stroke:#333,stroke-width:2px;
    classDef database fill:#9900ff,stroke:#333,stroke-width:2px;
    classDef external fill:#ff0099,stroke:#333,stroke-width:2px;

    class Browser,NextJS,React,Auth primary;
    class API,Prisma,Cache secondary;
    class Supabase database;
    class GitHub,Vercel,CDN external;
```

## 技術スタックの詳細

### フロントエンド

- **Next.js 14**: App Routerを使用したサーバーコンポーネント
- **React 18**: Suspense, Server Componentsサポート
- **TailwindCSS**: スタイリング
- **ShadcnUI**: UIコンポーネント
- **NextAuth.js**: 認証
- **! 何故かvercelで動作が確認できません D3.js→VisJSに以降**:フォローグラフの描画

### バックエンド

- **Next.js API Routes**: RESTful API
- **Prisma**: 型安全ORM
- **PostgreSQL**: データベース

### インフラストラクチャ

- **Vercel**: ホスティング & デプロイ
- **Supabase**: データベースホスティング
- **GitHub Actions**: CI/CD

### 開発ツール

- **TypeScript**: 型安全性
- **ESLint**: コード品質
- **Prettier**: コードフォーマット

## 開発期間・体制

- 開発体制：個人開発
- 開発期間：2025.2 (約30時間)

## 工夫した点

- 意図的に投稿/アカウントの削除/編集機能を付けていません。今まで類似サービスを使ってきた経験からです。
- 意図的にユーザーIDは変更できませんし、決めることもできません。単にログイン機能としてのみ使われます。
- パスワードに漢字や平仮名を使うことができます。これでアルファベットだけとは比べ物にならない強固なパスワードを少ない文字数で作ることができます。

## 既知の課題

- プッシュ通知の実装
- 検索機能の強化

## 各種リンク

- [2ufkpfbdaxnik](https://github.com/2ufkpfb9daxnik/pyrrhula)
- [ポートフォリオ](https://2ufkpfb9daxnik.github.io/portfolio/page/pyrrhula)
