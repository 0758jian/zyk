import express from 'express';
import axios from 'axios';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, '../dist')));

const API_BASE = process.env.API_BASE_URL || 'https://api.yzzy-api.com';
const CACHE_TTL = 60 * 60 * 1000;
const cache = new Map();

function cacheKey(path, params) {
  const sorted = Object.entries(params).sort().map(([k, v]) => `${k}=${v}`).join('&');
  return `${path}?${sorted}`;
}

function getCache(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key, data) {
  if (cache.size > 1000) {
    const first = cache.keys().next().value;
    cache.delete(first);
  }
  cache.set(key, { data, timestamp: Date.now() });
}

function extractData(rawData) {
  if (rawData.results && rawData.results[0] && rawData.results[0].raw_content) {
    let rawContent = rawData.results[0].raw_content;
    rawContent = rawContent.replace(/\\_/g, '_').replace(/\\\//g, '/');
    rawContent = rawContent.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
    return JSON.parse(rawContent);
  }
  return rawData;
}

async function fetchAndCache(path, query) {
  const key = cacheKey(path, query);
  const cached = getCache(key);
  if (cached) return cached;

  const response = await axios.get(`${API_BASE}/inc/apijson.php`, {
    params: query,
    timeout: 10000
  });
  const data = extractData(response.data);
  setCache(key, data);
  return data;
}

app.get('/api/detail', async (req, res) => {
  try {
    const { ac, t, pg, ids, wd } = req.query;
    const tValues = t ? t.split(',').filter(Boolean) : [];

    if (tValues.length > 1) {
      const cacheQuery = { ac: ac || 'detail', t, pg: pg || '1' };
      const key = cacheKey('/api/detail', cacheQuery);
      const cached = getCache(key);
      if (cached) return res.json({ success: true, data: cached });

      const promises = tValues.map(tid =>
        axios.get(`${API_BASE}/inc/apijson.php`, {
          params: { ac: ac || 'detail', t: tid, pg: '1' },
          timeout: 10000
        }).then(r => extractData(r.data))
         .catch(() => ({ list: [] }))
      );

      const results = await Promise.all(promises);
      const allVideos = results.flatMap(r => r.list || []);
      allVideos.sort((a, b) => (b.vod_time || 0) - (a.vod_time || 0));
      const page = parseInt(pg) || 1;
      const limit = 20;
      const start = (page - 1) * limit;
      const pagedList = allVideos.slice(start, start + limit);

      const merged = {
        code: 1,
        msg: 'ok',
        page,
        pagecount: Math.ceil(allVideos.length / limit) || 1,
        limit,
        total: allVideos.length,
        list: pagedList
      };
      setCache(key, merged);
      return res.json({ success: true, data: merged });
    }

    const query = { ac: ac || 'detail' };
    if (t) query.t = t;
    if (pg) query.pg = pg;
    if (ids) query.ids = ids;
    if (wd) query.wd = wd;

    const data = await fetchAndCache('/api/detail', query);
    res.json({ success: true, data });
  } catch (error) {
    console.error('API error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/types', async (req, res) => {
  try {
    const query = { ac: 'type' };
    const data = await fetchAndCache('/api/types', query);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/search', async (req, res) => {
  try {
    const { wd } = req.query;
    const query = { ac: 'detail', wd };
    const data = await fetchAndCache('/api/search', query);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/class', async (req, res) => {
  try {
    const { t } = req.query;
    const query = { ac: 'list', t };
    const data = await fetchAndCache('/api/class', query);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/proxy-video', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ error: 'Missing URL parameter' });
    }

    const urlObj = new URL(url);
    const referer = `https://${urlObj.host}/`;

    const response = await axios.get(url, {
      responseType: 'text',
      timeout: 10000,
      headers: {
        'Referer': referer,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Origin': referer,
        'Accept': '*/*',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
      }
    });

    const baseUrl = url.substring(0, url.lastIndexOf('/') + 1);
    let content = response.data;

    content = content.replace(/^(?!#)(?!.*\.(?:jpg|png|webp|svg)\s*$)[^\n]*\.(ts|m3u8)\b/gm, (match) => {
      const trimmed = match.trim();
      let fullUrl;
      if (trimmed.startsWith('http')) {
        fullUrl = trimmed;
      } else {
        fullUrl = new URL(trimmed, baseUrl).href;
      }
      const target = trimmed.endsWith('.m3u8') ? '/api/proxy-video' : '/api/proxy-ts';
      return `${target}?url=${encodeURIComponent(fullUrl)}`;
    });

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.send(content);
  } catch (error) {
    console.error('Proxy error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/proxy-ts', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ error: 'Missing URL parameter' });
    }
    
    const response = await axios.get(url, {
      responseType: 'stream',
      timeout: 30000
    });
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'video/mp2t');
    response.data.pipe(res);
  } catch (error) {
    console.error('Proxy TS error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
