const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');
const { Readability } = require('@mozilla/readability');
const { JSDOM } = require('jsdom');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Helper: WeChat article special handling
function parseWeChat(html, url) {
  const dom = new JSDOM(html, { url });
  const { document } = dom.window;
  const contentEl = document.querySelector('#js_content');
  if (!contentEl) return null;

  // Remove noise
  const selectorsToRemove = [
    '.qr_code_pc',
    '.rich_media_area_extra',
    '.follow_area',
    '#js_toobar3',
    '.weui-wa-hot-area'
  ];
  selectorsToRemove.forEach((sel) => {
    document.querySelectorAll(sel).forEach((n) => n.remove());
  });

  // Fix lazy images: data-src -> src; ensure absolute URLs
  contentEl.querySelectorAll('img').forEach((img) => {
    const dataSrc = img.getAttribute('data-src') || img.getAttribute('data-original');
    const src = img.getAttribute('src');
    let final = dataSrc || src || '';
    if (final.startsWith('//')) final = 'https:' + final;
    // Some images require referer; route through a public proxy to bypass hotlink protection (MVP)
    if (final && !final.startsWith('https://images.weserv.nl/')) {
      // Only rewrite known wechat domains
      if (/mmbiz\.qpic\.cn|wximg|weixin\.qq\.com/.test(final)) {
        final = `https://images.weserv.nl/?url=${encodeURIComponent(final.replace(/^https?:\/\//, ''))}`;
      }
    }
    if (final) img.setAttribute('src', final);
  });

  // Title / byline
  const title =
    document.querySelector('#activity-name')?.textContent?.trim() ||
    document.title ||
    '';
  const byline =
    document.querySelector('#js_name')?.textContent?.trim() ||
    document.querySelector('.profile_nickname')?.textContent?.trim() ||
    '';

  return {
    title,
    content: contentEl.innerHTML,
    textContent: contentEl.textContent || '',
    excerpt: '',
    byline,
    siteName: 'WeChat',
  };
}

// MongoDB Connection
if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('MongoDB connection error:', err));
}

// Routes

// 1. Health Check
app.get('/', (req, res) => {
  res.send('FlowRead Backend is running');
});

// 2. Parse Article (Core feature for "Paste Link & Read")
app.post('/api/parse', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Fetch the HTML content
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'https://mp.weixin.qq.com/',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
      },
      timeout: 15000,
      validateStatus: () => true
    });
    const html = response.data;
    const status = response.status;
    if (status >= 400) {
      return res.status(status).json({ error: `Upstream returned ${status}` });
    }

    // Special-case: WeChat OA articles
    if (/mp\.weixin\.qq\.com/.test(new URL(url).hostname)) {
      const wc = parseWeChat(html, url);
      if (wc) {
        return res.json({
          title: wc.title,
          content: wc.content,
          textContent: wc.textContent,
          excerpt: wc.excerpt,
          byline: wc.byline,
          siteName: wc.siteName,
          url
        });
      }
    }

    // Parse with Readability
    const doc = new JSDOM(html, { url });
    const reader = new Readability(doc.window.document);
    const article = reader.parse();

    if (!article) {
      return res.status(500).json({ error: 'Failed to parse article' });
    }

    res.json({
      title: article.title,
      content: article.content, // HTML content of the article
      textContent: article.textContent,
      excerpt: article.excerpt,
      byline: article.byline,
      siteName: article.siteName,
      url: url
    });

  } catch (error) {
    console.error('Error parsing article:', error.message);
    res.status(500).json({ error: 'Failed to fetch or parse URL', details: error.message });
  }
});

// Export app for Vercel
module.exports = app;

// Only listen when running locally
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}
