# 磁力链接在线播放器

这是一个基于Node.js和Vue.js的磁力链接在线播放器，允许用户输入磁力链接并直接在浏览器中观看视频内容。

## 功能特点

- 输入磁力链接，自动下载和处理种子
- 实时显示下载进度和速度
- 支持视频和音频文件的在线播放
- 支持文件下载
- 美观的用户界面

## 技术栈

### 后端
- Node.js
- Express
- WebTorrent
- Fluent-ffmpeg

### 前端
- Vue.js 3
- Vuex 4
- Vue Router 4
- Element Plus
- Axios

## 安装和使用

### 前提条件
- Node.js 14.x 或更高版本
- npm 或 yarn

### 安装步骤

1. 克隆仓库
```
git clone https://github.com/yourusername/magnet-streamer.git
cd magnet-streamer
```

2. 安装后端依赖
```
cd server
npm install
```

3. 安装前端依赖
```
cd ../client
npm install
```

### 运行应用

1. 启动后端服务器
```
cd server
npm run dev
```

2. 启动前端开发服务器
```
cd ../client
npm run serve
```

3. 在浏览器中访问 `http://localhost:8080`

## 部署到VPS

1. 在VPS上安装Node.js和npm

2. 克隆仓库并安装依赖

3. 构建前端
```
cd client
npm run build
```

4. 使用PM2或其他进程管理器启动后端
```
cd ../server
pm2 start index.js --name magnet-streamer
```

5. 配置Nginx或其他Web服务器作为反向代理

## 注意事项

- 请确保您的VPS提供商允许BitTorrent流量
- 请遵守当地法律法规，不要下载或分享受版权保护的内容
- 此应用仅用于学习和研究目的

## 许可证

ISC 