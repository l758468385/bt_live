const express = require('express');
const cors = require('cors');
const torrentStream = require('torrent-stream');
const path = require('path');
const fs = require('fs');
const rangeParser = require('range-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// 创建缓存目录
const CACHE_DIR = path.join(__dirname, 'cache');
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR);
}

// 启用CORS
app.use(cors());

// 活动引擎映射表
const activeEngines = {};

// 清理引擎的函数
function cleanupEngine(infoHash) {
  if (activeEngines[infoHash]) {
    console.log(`清理引擎: ${infoHash}`);
    activeEngines[infoHash].destroy(() => {
      delete activeEngines[infoHash];
    });
  }
}

// 获取或创建引擎
function getEngine(magnetLink) {
  const matches = magnetLink.match(/btih:([a-zA-Z0-9]+)/i);
  if (!matches) throw new Error('无效的磁力链接');
  
  const infoHash = matches[1].toLowerCase();
  
  if (!activeEngines[infoHash]) {
    console.log(`创建新引擎: ${infoHash}`);
    activeEngines[infoHash] = torrentStream(magnetLink, {
      tmp: CACHE_DIR,
      path: path.join(CACHE_DIR, infoHash),
      connections: 100,
      uploads: 10
    });
    
    // 设置自动清理定时器 (30分钟)
    setTimeout(() => cleanupEngine(infoHash), 30 * 60 * 1000);
  }
  
  return { engine: activeEngines[infoHash], infoHash };
}

// 处理磁力链接信息
app.get('/api/torrent-info', (req, res) => {
  const magnetLink = req.query.magnet;
  
  if (!magnetLink || !magnetLink.startsWith('magnet:?')) {
    return res.status(400).json({ error: '无效的磁力链接' });
  }
  
  try {
    const { engine, infoHash } = getEngine(magnetLink);
    
    // 等待引擎准备就绪
    if (engine.torrent) {
      // 引擎已准备就绪
      const files = engine.files.map((file, index) => ({
        index,
        name: file.name,
        path: file.path,
        length: file.length,
        // 仅保留媒体文件
        isMedia: /\.(mp4|mkv|avi|mov|wmv|flv|webm|mpg|mpeg|mp3|wav|flac|ogg)$/i.test(file.name)
      }));
      
      return res.json({ 
        files,
        infoHash,
        name: engine.torrent.name
      });
    }
    
    engine.on('ready', () => {
      const files = engine.files.map((file, index) => ({
        index,
        name: file.name,
        path: file.path,
        length: file.length,
        isMedia: /\.(mp4|mkv|avi|mov|wmv|flv|webm|mpg|mpeg|mp3|wav|flac|ogg)$/i.test(file.name)
      }));
      
      res.json({ 
        files, 
        infoHash,
        name: engine.torrent.name
      });
    });
    
    engine.on('error', (err) => {
      console.error('引擎错误:', err);
      res.status(500).json({ error: '处理种子时出错' });
      cleanupEngine(infoHash);
    });
    
  } catch (error) {
    console.error('获取种子信息错误:', error);
    res.status(500).json({ error: '处理种子时出错' });
  }
});

// 流式传输选定的文件
app.get('/api/stream/:infoHash/:fileIndex', (req, res) => {
  const { infoHash, fileIndex } = req.params;
  const fileIndexNum = parseInt(fileIndex, 10);
  
  if (!activeEngines[infoHash]) {
    return res.status(404).json({ error: '种子不存在或已过期' });
  }
  
  const engine = activeEngines[infoHash];
  
  if (!engine.files || fileIndexNum >= engine.files.length) {
    return res.status(404).json({ error: '文件不存在' });
  }
  
  const file = engine.files[fileIndexNum];
  const fileSize = file.length;
  
  // 解析范围请求头
  const rangeHeader = req.headers.range;
  let range;
  
  if (rangeHeader) {
    range = rangeParser(fileSize, rangeHeader)[0];
  }
  
  if (!range) {
    // 全文件请求
    res.setHeader('Content-Length', fileSize);
    res.setHeader('Content-Type', getContentType(file.name));
    
    // 创建可读流
    const stream = file.createReadStream();
    stream.pipe(res);
    
    // 处理流错误
    stream.on('error', (err) => {
      console.error('流错误:', err);
      if (!res.headersSent) {
        res.status(500).send('读取文件时出错');
      }
    });
    
    return;
  }
  
  // 范围请求
  res.status(206);
  res.setHeader('Content-Length', range.end - range.start + 1);
  res.setHeader('Content-Range', `bytes ${range.start}-${range.end}/${fileSize}`);
  res.setHeader('Content-Type', getContentType(file.name));
  res.setHeader('Accept-Ranges', 'bytes');
  
  // 创建指定范围的可读流
  const stream = file.createReadStream({
    start: range.start,
    end: range.end
  });
  
  stream.pipe(res);
  
  stream.on('error', (err) => {
    console.error('流错误:', err);
    if (!res.headersSent) {
      res.status(500).send('读取文件时出错');
    }
  });
});

// 获取下载状态
app.get('/api/status/:infoHash', (req, res) => {
  const { infoHash } = req.params;
  
  if (!activeEngines[infoHash]) {
    return res.status(404).json({ error: '种子不存在或已过期' });
  }
  
  const engine = activeEngines[infoHash];
  
  const status = {
    infoHash,
    downloaded: engine.swarm.downloaded,
    downloadSpeed: engine.swarm.downloadSpeed(),
    uploadSpeed: engine.swarm.uploadSpeed(),
    peers: engine.swarm.wires.length,
    progress: getProgress(engine)
  };
  
  res.json(status);
});

// 获取引擎进度
function getProgress(engine) {
  const torrent = engine.torrent;
  if (!torrent) return 0;
  
  const totalPieces = torrent.pieces.length;
  let downloaded = 0;
  
  for (let i = 0; i < totalPieces; i++) {
    if (engine.bitfield.get(i)) downloaded++;
  }
  
  return downloaded / totalPieces;
}

// 根据文件名获取内容类型
function getContentType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const types = {
    '.mp4': 'video/mp4',
    '.mkv': 'video/x-matroska',
    '.avi': 'video/x-msvideo',
    '.mov': 'video/quicktime',
    '.wmv': 'video/x-ms-wmv',
    '.flv': 'video/x-flv',
    '.webm': 'video/webm',
    '.mpg': 'video/mpeg',
    '.mpeg': 'video/mpeg',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.flac': 'audio/flac',
    '.ogg': 'audio/ogg'
  };
  
  return types[ext] || 'application/octet-stream';
}

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
}); 