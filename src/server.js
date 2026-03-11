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

const API_BASE = 'https://api.yzzy-api.com';

app.get('/api/detail', async (req, res) => {
  try {
    const { ac, t, pg, ids, wd } = req.query;
    const params = new URLSearchParams({ ac: ac || 'detail' });
    
    if (t) params.append('t', t);
    if (pg) params.append('pg', pg);
    if (ids) params.append('ids', ids);
    if (wd) params.append('wd', wd);
    
    const response = await axios.get(`${API_BASE}/inc/apijson.php`, {
      params,
      timeout: 10000
    });
    
    const rawData = response.data;
    
    if (rawData.results && rawData.results[0] && rawData.results[0].raw_content) {
      let rawContent = rawData.results[0].raw_content;
      rawContent = rawContent.replace(/\\_/g, '_').replace(/\\\//g, '/');
      rawContent = rawContent.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
      
      try {
        const apiData = JSON.parse(rawContent);
        res.json({
          success: true,
          data: apiData
        });
      } catch (e) {
        console.error('JSON parse error:', e);
        res.status(500).json({ success: false, error: '数据解析失败' });
      }
    } else {
      res.json({ success: true, data: rawData });
    }
  } catch (error) {
    console.error('API error:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

app.get('/api/types', async (req, res) => {
  try {
    const response = await axios.get(`${API_BASE}/inc/apijson.php`, {
      params: { ac: 'type' },
      timeout: 10000
    });
    
    const rawData = response.data;
    if (rawData.results && rawData.results[0] && rawData.results[0].raw_content) {
      let rawContent = rawData.results[0].raw_content;
      rawContent = rawContent.replace(/\\_/g, '_').replace(/\\\//g, '/');
      const apiData = JSON.parse(rawContent);
      res.json({ success: true, data: apiData });
    } else {
      res.json({ success: true, data: rawData });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/search', async (req, res) => {
  try {
    const { wd } = req.query;
    const response = await axios.get(`${API_BASE}/inc/apijson.php`, {
      params: { ac: 'detail', wd },
      timeout: 10000
    });
    
    const rawData = response.data;
    if (rawData.results && rawData.results[0] && rawData.results[0].raw_content) {
      let rawContent = rawData.results[0].raw_content;
      rawContent = rawContent.replace(/\\_/g, '_').replace(/\\\//g, '/');
      rawContent = rawContent.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
      const apiData = JSON.parse(rawContent);
      res.json({ success: true, data: apiData });
    } else {
      res.json({ success: true, data: rawData });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/class', async (req, res) => {
  try {
    const { t } = req.query;
    const response = await axios.get(`${API_BASE}/inc/apijson.php`, {
      params: { ac: 'list', t },
      timeout: 10000
    });
    
    const rawData = response.data;
    if (rawData.results && rawData.results[0] && rawData.results[0].raw_content) {
      let rawContent = rawData.results[0].raw_content;
      rawContent = rawContent.replace(/\\_/g, '_').replace(/\\\//g, '/');
      const apiData = JSON.parse(rawContent);
      res.json({ success: true, data: apiData });
    } else {
      res.json({ success: true, data: rawData });
    }
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
      responseType: 'stream',
      timeout: 10000,
      headers: {
        'Referer': referer,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Origin': referer,
        'Accept': '*/*',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
      }
    });
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    response.data.pipe(res);
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
