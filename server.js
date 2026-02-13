const express = require('express');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = 3000;

// 静的ファイルを提供
app.use(express.static(path.join(__dirname, 'public')));

// プロキシエンドポイント
app.get('/proxy', async (req, res) => {
  const targetUrl = req.query.url;

  if (!targetUrl) {
    return res.status(400).send('URL is required');
  }

  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Custom Proxy',
        // 必要に応じて他のヘッダーを追加できます
      },
    });

    const contentType = response.headers.get('content-type');
    res.set('Content-Type', contentType);
    const data = await response.text();
    res.send(data);
  } catch (error) {
    console.error('Error fetching the URL:', error);
    res.status(500).send('Error fetching the URL');
  }
});

// サーバーの起動
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
