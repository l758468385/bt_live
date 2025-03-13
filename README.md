# 磁力链接在线播放器

一个基于Vue.js + Node.js + torrent-stream的磁力链接在线播放器，支持输入磁力链接直接在浏览器中播放视频。

## 功能特点

- 通过磁力链接直接在线播放视频
- 显示下载状态和进度
- 实时显示下载/上传速度和连接节点
- 支持多种视频和音频格式
- 优雅的用户界面
- 支持范围请求，可以拖动进度条
- 自动清理缓存，防止磁盘空间占满

## 项目结构

```
magnet-player/
├── client/               # Vue前端
│   ├── public/           # 静态资源
│   └── src/              # 源代码
│       ├── components/   # 组件
│       ├── store/        # Vuex状态管理
│       └── router/       # Vue路由
└── server/               # Node后端
    ├── cache/            # 缓存目录（自动创建）
    └── server.js         # 服务器入口文件
```

## Docker部署（推荐）

### 前提条件

- 安装了Docker和Docker Compose的VPS服务器
- 开放3000端口

### 部署步骤

1. 克隆项目到VPS服务器

```bash
git clone https://github.com/your-username/magnet-player.git
cd magnet-player
```

2. 使用Docker Compose构建和启动服务

```bash
# 构建Docker镜像
docker-compose build

# 启动服务（后台运行）
docker-compose up -d
```

3. 访问应用

打开浏览器，访问 `http://your-vps-ip:3000`

### Docker命令参考

```bash
# 启动服务
docker-compose up -d

# 停止服务
docker-compose down

# 查看日志
docker-compose logs -f

# 重启服务
docker-compose restart
```

## 手动安装说明

### 前提条件

- Node.js 14+
- npm 或 yarn

### 服务器安装

```bash
# 进入服务器目录
cd server

# 安装依赖
npm install

# 启动服务器
npm start
```

服务器将在 http://localhost:3000 启动。

### 客户端安装

```bash
# 进入客户端目录
cd client

# 安装依赖
npm install

# 启动开发服务
npm run serve
```

前端开发服务器将在 http://localhost:8080 启动。

## 使用说明

1. 打开浏览器访问你的VPS服务器 `http://your-vps-ip:3000`
2. 在输入框中粘贴磁力链接
3. 点击"加载"按钮
4. 从文件列表中选择要播放的媒体文件
5. 开始观看！

## 缓存管理

系统已集成智能缓存管理功能：

- 页面关闭时会自动清理当前种子的缓存
- 每30分钟清理不活跃的种子引擎
- 每24小时自动清理超过1天未访问的缓存目录
- 可以通过界面上的"清理缓存"按钮手动清理

## 注意事项

- 播放速度取决于种子的健康状况（做种人数）
- 请遵守当地法律法规，不要播放侵权内容
- Docker部署方式会将缓存存储在Docker卷中，重启容器不会丢失

## 技术栈

- **前端**: Vue 3, Vuex, Vue Router, Axios
- **后端**: Node.js, Express, torrent-stream
- **部署**: Docker, Docker Compose

## 许可证

MIT 