const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
import WebTorrent from 'webtorrent'

const fs = require('fs');
const path = require('path');

// 初始化Express应用
const app = express();
const PORT = process.env.PORT || 3000;

// 初始化WebTorrent客户端
const client = new WebTorrent();
const activeTorrents = new Map();

// 中间件
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// 路由
// 1. 添加新的磁力链接
app.post('/api/magnet', async (req, res) => {
  try {
    const { magnetURI } = req.body;
    
    if (!magnetURI) {
      return res.status(400).json({ error: '请提供磁力链接' });
    }
    
    // 检查是否已经在下载此种子
    if (activeTorrents.has(magnetURI)) {
      return res.json({ 
        message: '已经添加此磁力链接',
        torrentInfo: getTorrentInfo(activeTorrents.get(magnetURI))
      });
    }
    
    console.log(`添加新的磁力链接: ${magnetURI}`);
    
    // 添加种子
    client.add(magnetURI, (torrent) => {
      console.log(`开始下载: ${torrent.name}`);
      activeTorrents.set(magnetURI, torrent);
      
      // 监听事件
      torrent.on('ready', () => {
        console.log(`种子准备就绪: ${torrent.name}`);
      });
      
      torrent.on('download', (bytes) => {
        console.log(`下载速度: ${formatBytes(torrent.downloadSpeed)}/s | 进度: ${(torrent.progress * 100).toFixed(2)}%`);
      });
      
      torrent.on('done', () => {
        console.log(`种子下载完成: ${torrent.name}`);
      });
    });
    
    // 在WebTorrent完成初始化前返回响应
    return res.status(202).json({ message: '磁力链接已添加，开始处理' });
  } catch (error) {
    console.error('处理磁力链接时出错:', error);
    return res.status(500).json({ error: '处理磁力链接时出错' });
  }
});

// 2. 获取所有活动种子信息
app.get('/api/torrents', (req, res) => {
  const torrents = Array.from(activeTorrents.values()).map(getTorrentInfo);
  res.json({ torrents });
});

// 3. 获取特定种子信息
app.get('/api/torrent/:infoHash', (req, res) => {
  const { infoHash } = req.params;
  const torrent = client.torrents.find(t => t.infoHash === infoHash);
  
  if (!torrent) {
    return res.status(404).json({ error: '找不到指定的种子' });
  }
  
  res.json({ torrent: getTorrentInfo(torrent) });
});

// 4. 流媒体端点 - 流式传输特定文件
app.get('/api/stream/:infoHash/:fileIndex', (req, res) => {
  const { infoHash, fileIndex } = req.params;
  const torrent = client.torrents.find(t => t.infoHash === infoHash);
  
  if (!torrent) {
    return res.status(404).json({ error: '找不到指定的种子' });
  }
  
  const file = torrent.files[parseInt(fileIndex)];
  
  if (!file) {
    return res.status(404).json({ error: '找不到指定的文件' });
  }
  
  // 获取视频文件的范围
  const range = req.headers.range;
  if (!range) {
    // 如果没有指定范围，则返回整个文件
    res.setHeader('Content-Type', getContentType(file.name));
    res.setHeader('Content-Length', file.length);
    file.createReadStream().pipe(res);
    return;
  }
  
  // 处理范围请求
  const fileSize = file.length;
  const parts = range.replace(/bytes=/, '').split('-');
  const start = parseInt(parts[0], 10);
  const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
  const chunkSize = (end - start) + 1;
  
  res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Content-Length', chunkSize);
  res.setHeader('Content-Type', getContentType(file.name));
  res.status(206); // 部分内容
  
  const stream = file.createReadStream({ start, end });
  stream.pipe(res);
});

// 5. 获取文件列表
app.get('/api/files/:infoHash', (req, res) => {
  const { infoHash } = req.params;
  const torrent = client.torrents.find(t => t.infoHash === infoHash);
  
  if (!torrent) {
    return res.status(404).json({ error: '找不到指定的种子' });
  }
  
  const files = torrent.files.map((file, index) => ({
    index,
    name: file.name,
    path: file.path,
    length: file.length,
    type: getContentType(file.name),
    isVideo: isVideoFile(file.name),
    isAudio: isAudioFile(file.name)
  }));
  
  res.json({ files });
});

// 6. 停止并移除种子
app.delete('/api/torrent/:infoHash', (req, res) => {
  const { infoHash } = req.params;
  const torrent = client.torrents.find(t => t.infoHash === infoHash);
  
  if (!torrent) {
    return res.status(404).json({ error: '找不到指定的种子' });
  }
  
  const magnetURI = torrent.magnetURI;
  
  client.remove(infoHash, (err) => {
    if (err) {
      return res.status(500).json({ error: '移除种子时出错' });
    }
    
    activeTorrents.delete(magnetURI);
    res.json({ message: '种子已成功移除' });
  });
});

// 辅助函数
function getTorrentInfo(torrent) {
  return {
    infoHash: torrent.infoHash,
    name: torrent.name,
    magnetURI: torrent.magnetURI,
    progress: torrent.progress,
    downloadSpeed: torrent.downloadSpeed,
    uploadSpeed: torrent.uploadSpeed,
    numPeers: torrent.numPeers,
    downloaded: torrent.downloaded,
    uploaded: torrent.uploaded,
    timeRemaining: torrent.timeRemaining,
    files: torrent.files.map((file, index) => ({
      index,
      name: file.name,
      path: file.path,
      length: file.length,
      type: getContentType(file.name),
      isVideo: isVideoFile(file.name),
      isAudio: isAudioFile(file.name)
    }))
  };
}

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function getContentType(filename) {
  const ext = path.extname(filename).toLowerCase();
  
  const mimeTypes = {
    '.mp4': 'video/mp4',
    '.mkv': 'video/x-matroska',
    '.avi': 'video/x-msvideo',
    '.mov': 'video/quicktime',
    '.wmv': 'video/x-ms-wmv',
    '.flv': 'video/x-flv',
    '.webm': 'video/webm',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.flac': 'audio/flac',
    '.aac': 'audio/aac',
    '.ogg': 'audio/ogg',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.pdf': 'application/pdf',
    '.txt': 'text/plain',
    '.zip': 'application/zip',
    '.rar': 'application/x-rar-compressed',
    '.7z': 'application/x-7z-compressed',
    '.tar': 'application/x-tar',
    '.gz': 'application/gzip'
  };
  
  return mimeTypes[ext] || 'application/octet-stream';
}

function isVideoFile(filename) {
  const videoExts = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm'];
  const ext = path.extname(filename).toLowerCase();
  return videoExts.includes(ext);
}

function isAudioFile(filename) {
  const audioExts = ['.mp3', '.wav', '.flac', '.aac', '.ogg'];
  const ext = path.extname(filename).toLowerCase();
  return audioExts.includes(ext);
}

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
}); 