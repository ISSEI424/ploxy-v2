'use strict';

const express = require('express');
const fetch = require('node-fetch');
const session = require('express-session');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { URL } = require('url');
const cheerio = require('cheerio');

const app = express();

const PORT = process.env.PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || 'change_me_in_production';
const AUTH_USER = process.env.AUTH_USER || 'admin';
const AUTH_PASS = process.env.AUTH_PASS || '1234';
const MAX_HTML_SIZE = 1024 * 1024 * 2;

app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use(express.static('public', { index: false }));

app.use(helmet({ contentSecurityPolicy: false }));

app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60
  }
}));

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

function isAllowedScheme(u) {
  return ['http:', 'https:'].includes(u.protocol);
}

app.post('/login', (req, res) => {
  const { user, pass } = req.body || {};
  if (user === AUTH_USER && pass === AUTH_PASS) {
    req.session.logged = true;
    return res.redirect('/?login=success');
  }
  res.status(401).send('Login failed');
});

app.get('/proxy', async (req, res) => {
  try {
    if (!req.session || !req.session.logged) return res.redirect('/');

    const raw = req.query.url;
    if (!raw) return res.status(400).send('No URL provided');

    let target;
    try {
      target = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
    } catch (e) {
      return res.status(400).send('Invalid URL');
    }

    if (!isAllowedScheme(target)) return res.status(400).send('Unsupported URL scheme');

    const fetched = await fetch(target.href, { redirect: 'follow', compress: true, size: MAX_HTML_SIZE });
    const contentType = fetched.headers.get('content-type') || '';

    if (contentType.includes('text/html')) {
      const body = await fetched.text();
      const $ = cheerio.load(body, { decodeEntities: false });
      const attrs = ['href', 'src', 'action', 'srcset'];

      attrs.forEach(attr => {
        $(`[${attr}]`).each((i, el) => {
          try {
            const orig = $(el).attr(attr);
            if (!orig) return;
            if (attr === 'srcset') {
              const parts = orig.split(',').map(p => p.trim()).map(part => {
                const [urlPart, descriptor] = part.split(/\s+/, 2);
                const resolved = new URL(urlPart, target.href);
                if (!isAllowedScheme(resolved)) return urlPart;
                return `/proxy?url=${encodeURIComponent(resolved.href)}` + (descriptor ? (' ' + descriptor) : '');
              });
              $(el).attr(attr, parts.join(', '));
              return;
            }

            const resolved = new URL(orig, target.href);
            if (!isAllowedScheme(resolved)) return;
            const blocked = ['mailto:', 'tel:', 'javascript:', 'data:', 'file:'];
            if (blocked.includes(resolved.protocol)) return;

            if (resolved.origin === req.protocol + '://' + req.get('host')) {
              $(el).attr(attr, resolved.href);
            } else {
              $(el).attr(attr, `/proxy?url=${encodeURIComponent(resolved.href)}`);
            }

            if (attr === 'href') {
              $(el).attr('rel', 'noopener noreferrer');
            }
          } catch (e) {
            // skip
          }
        });
      });

      res.set('X-Content-Type-Options', 'nosniff');
      res.set('X-Frame-Options', 'DENY');
      res.type('html').send($.html());
    } else {
      res.set('Content-Type', contentType);
      res.set('Cache-Control', 'public, max-age=60');
      const stream = fetched.body;
      stream.pipe(res);
    }
  } catch (err) {
    console.error('Proxy error:', err);
    res.status(500).send('Error fetching the URL');
  }
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  res.status(500).send('Internal Server Error');
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
