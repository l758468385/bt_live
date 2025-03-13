# 使用Node.js官方镜像作为基础镜像
FROM node:16-alpine

# 设置工作目录
WORKDIR /app

# 拷贝package.json文件
COPY package.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/

# 安装依赖
RUN cd server && npm install
RUN cd client && npm install

# 拷贝所有文件
COPY . .

# 构建前端应用
RUN cd client && npm run build

# 暴露端口
EXPOSE 3000

# 创建缓存目录并设置权限
RUN mkdir -p /app/server/cache && chmod -R 777 /app/server/cache

# 设置启动命令
CMD ["node", "server/server.js"] 