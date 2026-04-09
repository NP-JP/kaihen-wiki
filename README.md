# 改変用語まとめWiki

VRChatなどの改変にまつわる用語を解説するWikiサイトです。

## 技術スタック
- **Frontend**: React + Vite
- **Database/Auth**: Supabase
- **Editor**: Tiptap (Visual Editor)
- **Styling**: Vanilla CSS

## 公開・デプロイ方法

### 1. 準備
このリポジトリを公開する前に、`.env.example` を参考に `.env` ファイルを作成し、自身の Supabase の URL と API Key を設定してください。

### 2. ローカルでの実行
```bash
npm install
npm run dev
```

### 3. デプロイ
このプロジェクトは Vercel や Netlify で簡単に公開できます。
- GitHub にプッシュします。
- Vercel/Netlify でリポジトリを選択します。
- 環境変数（Environment Variables）に `VITE_SUPABASE_URL` と `VITE_SUPABASE_ANON_KEY` を設定してください。

## ライセンス
MIT
