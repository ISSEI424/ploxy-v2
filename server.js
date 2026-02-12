const express = require("express");
const fetch = require("node-fetch");
const session = require("express-session");
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// セッションの設定
app.use(session({
  secret: 'yourSecretKey',
  resave: false,
  saveUninitialized: true
}));

const USER = "admin"; // ユーザー名
const PASS = "1234";  // パスワード

// ログイン処理
app.post("/login", (req, res) => {
  if (req.body.user === USER && req.body.pass === PASS) {
    req.session.logged = true; // セッションにログイン情報を保存
    res.redirect("/?login=success");
  } else {
    res.status(401).send("Login failed");
  }
});

// プロキシ処理
app.get("/proxy", async (req, res) => {
  if (!req.session.logged) return res.redirect("/");

  const url = req.query.url;
  if (!url) return res.status(400).send("No URL provided");

  let target = url;
  if (!target.startsWith("http")) target = "https://" + target;

  try {
    const response = await fetch(target);
    let text = await response.text();

    // リンクをプロキシ経由に書き換える
    text = text.replace(/href=["']([^"']+)["']/g, (match, p1) => {
      const newUrl = p1.startsWith('http') ? p1 : (new URL(p1, target)).href; // 絶対URLまたは相対URL処理
      return `href="/proxy?url=${encodeURIComponent(newUrl)}"`;
    });

    // スクリプトsrc属性もプロキシ経由に変更
    text = text.replace(/src=["']([^"']+)["']/g, (match, p1) => {
      const newUrl = p1.startsWith('http') ? p1 : (new URL(p1, target)).href;
      return `src="/proxy?url=${encodeURIComponent(newUrl)}"`;
    });

    res.send(text);
  } catch (error) {
    console.error("Proxy error:", error);
    res.status(500).send("Error fetching the URL");
  }
});

// エラーハンドリング
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something went wrong!');
});

// サーバーを起動
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
