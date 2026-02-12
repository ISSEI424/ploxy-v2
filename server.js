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
    const text = await response.text();

    // レスポンスのHTML内のリンクを変更する
    const modifiedText = text.replace(/href="([^"]+)"/g, (match, p1) => {
      let newUrl = p1;
      
      // 絶対URLの場合
      if (newUrl.startsWith('http')) {
        newUrl = `/proxy?url=${encodeURIComponent(newUrl)}`;
      }
      // 相対URLの場合
      else {
        newUrl = `/proxy?url=${encodeURIComponent(new URL(newUrl, target).href)}`;
      }
      
      return `href="${newUrl}"`;
    });

    res.send(modifiedText);
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
