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

// 设置定时清理任务 - 每天清理一次
const CACHE_CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24小时
setInterval(cleanupAllCache, CACHE_CLEANUP_INTERVAL);

// 清理所有缓存的函数
async function cleanupAllCache() {
  try {
    console.log('执行定时缓存清理...');
    
    // 获取所有活动引擎的hashID
    const activeEngineHashes = Object.keys(activeEngines);
    
    // 读取缓存目录
    if (fs.existsSync(CACHE_DIR)) {
      const cacheDirs = fs.readdirSync(CACHE_DIR);
      
      // 查找超过1天未被访问的缓存目录
      const now = Date.now();
      for (const dir of cacheDirs) {
        // 跳过活动引擎的缓存目录
        if (activeEngineHashes.includes(dir.toLowerCase())) {
          continue;
        }
        
        const fullPath = path.join(CACHE_DIR, dir);
        if (fs.statSync(fullPath).isDirectory()) {
          // 获取目录的最后访问时间
          const stats = fs.statSync(fullPath);
          const lastAccessTime = stats.atime.getTime();
          
          // 如果超过1天未访问，则删除
          if (now - lastAccessTime > 24 * 60 * 60 * 1000) {
            try {
              fs.rmSync(fullPath, { recursive: true, force: true });
              console.log(`已清理过期缓存: ${dir}`);
            } catch (err) {
              console.error(`清理过期缓存失败 ${dir}:`, err);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('定时清理缓存失败:', error);
  }
}

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
      connections: 200,
      uploads: 20,
      trackers: [
        // HTTP Trackers
        'http://0d.kebhana.mx:443/announce',
        'http://1337.abcvg.info:80/announce',
        'http://207.241.226.111:6969/announce',
        'http://207.241.231.226:6969/announce',
        'http://4.tracker.devnak.win:6969/announce',
        'http://bittorrent-tracker.e-n-c-r-y-p-t.net:1337/announce',
        'http://bt.okmp3.ru:2710/announce',
        'http://bt.poletracker.org:2710/announce',
        'http://bt1.xxxxbt.cc:6969/announce',
        'http://finbytes.org:80/announce.php',
        'http://fleira.no:6969/announce',
        'http://home.yxgz.club:6969/announce',
        'http://ipv4announce.sktorrent.eu:6969/announce',
        'http://ipv6.rer.lol:6969/announce',
        'http://lucke.fenesisu.moe:6969/announce',
        'http://nyaa.tracker.wf:7777/announce',
        'http://open.trackerlist.xyz:80/announce',
        'http://p4p.arenabg.com:1337/announce',
        'http://retracker.hotplug.ru:2710/announce',
        'http://retracker.spark-rostov.ru:80/announce',
        'http://seeders-paradise.org:80/announce',
        'http://share.hkg-fansub.info:80/announce.php',
        'http://shubt.net:2710/announce',
        'http://t.overflow.biz:6969/announce',
        'http://taciturn-shadow.spb.ru:6969/announce',
        'http://tk.greedland.net:80/announce',
        'http://torrentsmd.com:8080/announce',
        'http://tr.nyacat.pw:80/announce',
        'http://tracker.23794.top:6969/announce',
        'http://tracker.beeimg.com:6969/announce',
        'http://tracker.bittor.pw:1337/announce',
        'http://tracker.bt4g.com:2095/announce',
        'http://tracker.bz:80/announce',
        'http://tracker.darkness.services:6969/announce',
        'http://tracker.dler.com:6969/announce',
        'http://tracker.dler.org:6969/announce',
        'http://tracker.dmcomic.org:2710/announce',
        'http://tracker.ipv6tracker.org:80/announce',
        'http://tracker.ipv6tracker.ru:80/announce',
        'http://tracker.lintk.me:2710/announce',
        'http://tracker.moxing.party:6969/announce',
        'http://tracker.mywaifu.best:6969/announce',
        'http://tracker.netmap.top:6969/announce',
        'http://tracker.qu.ax:6969/announce',
        'http://tracker.renfei.net:8080/announce',
        'http://tracker.waaa.moe:6969/announce',
        'http://tracker.xiaoduola.xyz:6969/announce',
        'http://tracker.zhuqiy.top:80/announce',
        'http://tracker2.dler.org:80/announce',
        'http://tracker2.itzmx.com:6961/announce',
        'http://tracker810.xyz:11450/announce',
        'http://wepzone.net:6969/announce',
        'http://www.all4nothin.net:80/announce.php',
        'http://www.genesis-sp.org:2710/announce',
        'http://www.wareztorrent.com:80/announce',

        // HTTPS Trackers
        'https://1337.abcvg.info:443/announce',
        'https://retracker.x2k.ru:443/announce',
        'https://sparkle.ghostchu-services.top:443/announce',
        'https://tr.abir.ga:443/announce',
        'https://tr.burnabyhighstar.com:443/announce',
        'https://tr.nyacat.pw:443/announce',
        'https://tr.zukizuki.org:443/announce',
        'https://tr2.trkb.ru:443/announce',
        'https://tracker.aburaya.live:443/announce',
        'https://tracker.bjut.jp:443/announce',
        'https://tracker.bt4g.com:443/announce',
        'https://tracker.cangku.moe:443/announce',
        'https://tracker.foreverpirates.co:443/announce',
        'https://tracker.gcrenwp.top:443/announce',
        'https://tracker.itscraftsoftware.my.id:443/announce',
        'https://tracker.kuroy.me:443/announce',
        'https://tracker.leechshield.link:443/announce',
        'https://tracker.lilithraws.org:443/announce',
        'https://tracker.linvk.com:443/announce',
        'https://tracker.moeking.me:443/announce',
        'https://tracker.nitrix.me:443/announce',
        'https://tracker.pmman.tech:443/announce',
        'https://tracker.yemekyedim.com:443/announce',
        'https://tracker.zhuqiy.top:443/announce',
        'https://tracker1.520.jp:443/announce',
        'https://trunker.ghostchu-services.top:443/announce',

        // UDP Trackers
        'udp://207.241.226.111:6969/announce',
        'udp://207.241.231.226:6969/announce',
        'udp://4.tracker.devnak.win:6969/announce',
        'udp://52.58.128.163:6969/announce',
        'udp://6.tracker.devnak.win:6969/announce',
        'udp://bittorrent-tracker.e-n-c-r-y-p-t.net:1337/announce',
        'udp://bt.ktrackers.com:6666/announce',
        'udp://bt.rer.lol:6969/announce',
        'udp://concen.org:6969/announce',
        'udp://d40969.acod.regrucolo.ru:6969/announce',
        'udp://discord.heihachi.pw:6969/announce',
        'udp://evan.im:6969/announce',
        'udp://exodus.desync.com:6969/announce',
        'udp://ipv4announce.sktorrent.eu:6969/announce',
        'udp://isk.richardsw.club:6969/announce',
        'udp://ismaarino.com:1234/announce',
        'udp://leet-tracker.moe:1337/announce',
        'udp://martin-gebhardt.eu:25/announce',
        'udp://ns-1.x-fins.com:6969/announce',
        'udp://open.demonii.com:1337/announce',
        'udp://open.dstud.io:6969/announce',
        'udp://open.free-tracker.ga:6969/announce',
        'udp://open.stealth.si:80/announce',
        'udp://open.tracker.ink:6969/announce',
        'udp://opentor.org:2710/announce',
        'udp://opentracker.io:6969/announce',
        'udp://p2p.publictracker.xyz:6969/announce',
        'udp://p4p.arenabg.com:1337/announce',
        'udp://retracker.hotplug.ru:2710/announce',
        'udp://retracker.lanta.me:2710/announce',
        'udp://retracker01-msk-virt.corbina.net:80/announce',
        'udp://t.overflow.biz:6969/announce',
        'udp://tr3.ysagin.top:2715/announce',
        'udp://tracker-udp.gbitt.info:80/announce',
        'udp://tracker.0x7c0.com:6969/announce',
        'udp://tracker.cyberia.is:6969/announce',
        'udp://tracker.darkness.services:6969/announce',
        'udp://tracker.ddunlimited.net:6969/announce',
        'udp://tracker.dler.com:6969/announce',
        'udp://tracker.dler.org:6969/announce',
        'udp://tracker.dump.cl:6969/announce',
        'udp://tracker.filemail.com:6969/announce',
        'udp://tracker.fnix.net:6969/announce',
        'udp://tracker.gigantino.net:6969/announce',
        'udp://tracker.gmi.gd:6969/announce',
        'udp://tracker.home.kmzs123.cn:17272/announce',
        'udp://tracker.iperson.xyz:6969/announce',
        'udp://tracker.kmzs123.cn:17272/announce',
        'udp://tracker.kmzs123.top:17272/announce',
        'udp://tracker.ololosh.space:6969/announce',
        'udp://tracker.opentrackr.org:1337/announce',
        'udp://tracker.qu.ax:6969/announce',
        'udp://tracker.srv00.com:6969/announce',
        'udp://tracker.theoks.net:6969/announce',
        'udp://tracker.tiny-vps.com:6969/announce',
        'udp://tracker.torrent.eu.org:451/announce',
        'udp://tracker.torrust-demo.com:6969/announce',
        'udp://tracker.tryhackx.org:6969/announce',
        'udp://tracker.valete.tf:9999/announce',
        'udp://tracker.yume-hatsuyuki.moe:6969/announce',
        'udp://tracker1.myporn.club:9337/announce',
        'udp://tracker2.dler.org:80/announce',
        'udp://tracker2.itzmx.com:6961/announce',
        'udp://tracker3.itzmx.com:6961/announce',
        'udp://tracker4.itzmx.com:2710/announce',
        'udp://ttk2.nbaonlineservice.com:6969/announce',
        'udp://udp.tracker.projectk.org:23333/announce',
        'udp://wepzone.net:6969/announce',
        'udp://www.torrent.eu.org:451/announce',

        // WebSocket Trackers
        'wss://tracker.openwebtorrent.com:443/announce'
      ]
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

const PIECE_LENGTH = 1024 * 1024; // 1MB per piece
const PRELOAD_SIZE = 10 * PIECE_LENGTH; // 10MB preload
const INITIAL_PIECES = 5; // Number of initial pieces to prioritize

// 添加缓存管理器
class StreamCache {
  constructor(maxSize = 100 * 1024 * 1024) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.currentSize = 0;
  }

  set(key, data) {
    while (this.currentSize + data.length > this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      const oldData = this.cache.get(oldestKey);
      this.currentSize -= oldData.length;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, data);
    this.currentSize += data.length;
  }

  get(key) {
    return this.cache.get(key);
  }
}

const streamCache = new StreamCache();

// 优化分片优先级
function prioritizeInitialPieces(engine, file) {
  const pieceLength = engine.torrent.pieceLength;
  const fileOffset = file.offset;
  const startPiece = Math.floor(fileOffset / pieceLength);
  
  // 设置前几个分片的优先级最高
  for (let i = 0; i < INITIAL_PIECES; i++) {
    const pieceIndex = startPiece + i;
    if (pieceIndex < engine.torrent.pieces.length) {
      engine.select(pieceIndex, pieceIndex + 1, 1);
    }
  }
}

// 创建带预加载的流
function createStreamWithPreload(file, range, engine) {
  const stream = file.createReadStream({
    start: range.start,
    end: range.end
  });

  // 预加载下一段数据
  const nextStart = range.end + 1;
  const nextEnd = Math.min(nextStart + PRELOAD_SIZE, file.length - 1);
  
  if (nextEnd > nextStart) {
    const startPiece = Math.floor(nextStart / engine.torrent.pieceLength);
    const endPiece = Math.floor(nextEnd / engine.torrent.pieceLength);
    
    for (let i = startPiece; i <= endPiece; i++) {
      engine.select(i, i + 1, 1);
    }
  }

  return stream;
}

// 修改流式传输处理
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

  // 初始化文件的优先级
  prioritizeInitialPieces(engine, file);
  
  // 解析范围请求头
  const rangeHeader = req.headers.range;
  let range;
  
  if (rangeHeader) {
    const ranges = rangeParser(fileSize, rangeHeader);
    range = ranges[0];
  }
  
  if (!range) {
    // 全文件请求
    res.setHeader('Content-Length', fileSize);
    res.setHeader('Content-Type', getContentType(file.name));
    
    // 创建可读流（带预加载）
    const stream = createStreamWithPreload(file, { start: 0, end: fileSize - 1 }, engine);
    stream.pipe(res);
    
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

  // 检查缓存
  const cacheKey = `${infoHash}:${fileIndex}:${range.start}-${range.end}`;
  const cachedData = streamCache.get(cacheKey);
  
  if (cachedData) {
    res.end(cachedData);
    return;
  }
  
  // 创建带预加载的流
  const stream = createStreamWithPreload(file, range, engine);
  
  // 收集数据以缓存
  const chunks = [];
  stream.on('data', (chunk) => {
    chunks.push(chunk);
  });
  
  stream.on('end', () => {
    const data = Buffer.concat(chunks);
    streamCache.set(cacheKey, data);
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

// 清理种子缓存
app.delete('/api/cleanup/:infoHash', async (req, res) => {
  const { infoHash } = req.params;
  
  try {
    // 先销毁引擎
    if (activeEngines[infoHash]) {
      await new Promise((resolve) => {
        activeEngines[infoHash].destroy(() => {
          delete activeEngines[infoHash];
          resolve();
        });
      });
    }
    
    // 删除缓存目录
    const torrentCacheDir = path.join(CACHE_DIR, infoHash);
    if (fs.existsSync(torrentCacheDir)) {
      try {
        // 递归删除目录及其内容
        fs.rmSync(torrentCacheDir, { recursive: true, force: true });
        console.log(`已清理缓存: ${infoHash}`);
      } catch (err) {
        console.error(`清理缓存失败 ${infoHash}:`, err);
      }
    }
    
    res.json({ success: true, message: `已清理缓存: ${infoHash}` });
  } catch (error) {
    console.error('清理失败:', error);
    res.status(500).json({ success: false, error: '清理缓存时出错' });
  }
});

// 清理所有缓存
app.delete('/api/cleanup-all', async (req, res) => {
  try {
    // 销毁所有活动引擎
    const engineHashes = Object.keys(activeEngines);
    
    // 逐个销毁引擎
    for (const hash of engineHashes) {
      await new Promise((resolve) => {
        activeEngines[hash].destroy(() => {
          delete activeEngines[hash];
          resolve();
        });
      });
    }
    
    // 清空缓存目录
    if (fs.existsSync(CACHE_DIR)) {
      // 读取所有缓存目录
      const cacheDirs = fs.readdirSync(CACHE_DIR);
      
      // 逐个删除目录
      for (const dir of cacheDirs) {
        const fullPath = path.join(CACHE_DIR, dir);
        if (fs.statSync(fullPath).isDirectory()) {
          try {
            fs.rmSync(fullPath, { recursive: true, force: true });
          } catch (err) {
            console.error(`清理缓存目录失败 ${dir}:`, err);
          }
        }
      }
    }
    
    console.log('已清理所有缓存');
    res.json({ success: true, message: '已清理所有缓存' });
  } catch (error) {
    console.error('清理所有缓存失败:', error);
    res.status(500).json({ success: false, error: '清理所有缓存时出错' });
  }
});

// 添加静态文件托管功能
const CLIENT_BUILD_PATH = path.resolve(__dirname, '../client/dist');

// 检查是否存在构建好的前端应用
if (fs.existsSync(CLIENT_BUILD_PATH)) {
  console.log('为前端应用提供静态文件服务...');
  
  // 为静态资源提供服务
  app.use(express.static(CLIENT_BUILD_PATH));
  
  // 其他所有路由都返回index.html
  app.get('*', (req, res) => {
    // 排除API路由
    if (!req.path.startsWith('/api/')) {
      res.sendFile(path.join(CLIENT_BUILD_PATH, 'index.html'));
    }
  });
}

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