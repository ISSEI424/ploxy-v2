const express = require('express');
const fetch = require('node-fetch');
const session = require('express-session');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// セッション設定
app.use(session({
  secret: 'secret_key',
  resave: false,
  saveUninitialized: true
}));

// ログイン情報
const users = {
  user: 'password123'  // ユーザー名: user, パスワード: password123
};

// ログインページ
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// ログイン処理
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (users[username] && users[username] === password) {
    req.session.authenticated = true;
    res.redirect('/'); // ログイン成功後は同じページにリダイレクト
  } else {
    res.send('認証情報が間違っています。');
  }
});

// プロキシエンドポイント
app.get('/proxy', async (req, res) => {
  if (!req.session.authenticated) {
    return res.status(401).send('ログインが必要です');
  }
  
  const targetUrl = req.query.url;
  
  if (!targetUrl) {
    return res.status(400).send('URLが必要です');
  }

  try {
    const response = await fetch(targetUrl);
    const contentType = response.headers.get('content-type');
    res.set('Content-Type', contentType);
    const data = await response.text();
    res.send(data);
  } catch (error) {
    console.error('エラー:', error);
    res.status(500).send('URLの取得に失敗しました');
  }
});

// サーバーの起動
app.listen(PORT, () => {
  console.log(`サーバーがポート ${PORT} で実行中`);
});
