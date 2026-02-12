const express = require("express");
const fetch = require("node-fetch");
const session = require("express-session");
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// セッションの設定
app.use(session({
  secret: 'yourSecretKey', // 固定のシークレットキー
  resave: false,
  saveUninitialized: true
}));

// 簡単なログイン情報
const USER = "admin"; // ユーザー名
const PASS = "1234";  // パスワード

// ログイン処理
app.post("/login", (req, res) => {
  if (req.body.user === USER && req.body.pass === PASS) {
    req.session.logged = true; // セッションにログイン情報を保存
    res.redirect("/?login=success"); // クエリパラメータを追加
  } else {
    res.status(401).send("Login failed"); // 401 Unauthorized
  }
});

// プロキシ処理
app.get("/proxy", async (req, res) => {
  if (!req.session.logged) return res.redirect("/");

  const url = req.query.url;
  if (!url) return res.status(400).send("No URL provided"); // 400 Bad Request

  let target = url;
  if (!target.startsWith("http")) target = "https://" + target;

  try {
    const response = await fetch(target);
    const text = await response.text();
    res.send(text);
  } catch (error) {
    console.error("Proxy error:", error); // エラーログを出力
    res.status(500).send("Error fetching the URL"); // 500 Internal Server Error
  }
});

// エラーハンドリング
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something went wrong!'); // エラー処理
});

// サーバーを起動
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
