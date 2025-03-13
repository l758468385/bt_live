<template>
  <div class="torrent-player">
    <!-- 磁力链接输入区 -->
    <div class="input-section">
      <h2>输入磁力链接</h2>
      <div class="input-group">
        <input 
          type="text" 
          v-model="magnetLink" 
          placeholder="magnet:?xt=urn:btih:..." 
          @keyup.enter="loadTorrent"
        />
        <button 
          @click="loadTorrent" 
          :disabled="loading || !magnetLink"
          class="primary-btn"
        >
          {{ loading ? '加载中...' : '加载' }}
        </button>
      </div>
      <div v-if="error" class="error-message">{{ error }}</div>
    </div>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>正在解析磁力链接，请稍候...</p>
    </div>

    <!-- 文件列表区域 -->
    <div v-if="torrentInfo && !loading" class="content-section">
      <div class="torrent-info">
        <h2>{{ torrentInfo.name || '未命名种子' }}</h2>
        <div v-if="mediaFiles.length === 0" class="no-media">
          未找到可播放的媒体文件
        </div>
      </div>

      <div class="files-container">
        <div class="files-list">
          <h3>可播放文件</h3>
          <ul>
            <li 
              v-for="file in mediaFiles" 
              :key="file.index"
              :class="{ active: currentFile && currentFile.index === file.index }"
              @click="playFile(file.index)"
            >
              <span class="file-name">{{ file.name }}</span>
              <span class="file-size">{{ formatFileSize(file.length) }}</span>
            </li>
          </ul>
        </div>

        <!-- 播放器区域 -->
        <div class="player-container" v-if="currentFile">
          <h3>{{ currentFile.name }}</h3>
          <video 
            controls 
            autoplay
            class="video-player"
          >
            <source :src="videoUrl" type="video/mp4">
            您的浏览器不支持HTML5视频
          </video>

          <!-- 下载状态 -->
          <div class="status-panel" v-if="formattedStatus">
            <div class="status-item">
              <span>下载速度:</span>
              <strong>{{ formattedStatus.downloadSpeedFormatted }}</strong>
            </div>
            <div class="status-item">
              <span>上传速度:</span>
              <strong>{{ formattedStatus.uploadSpeedFormatted }}</strong>
            </div>
            <div class="status-item">
              <span>已下载:</span>
              <strong>{{ formattedStatus.downloadedFormatted }}</strong>
            </div>
            <div class="status-item">
              <span>连接节点:</span>
              <strong>{{ formattedStatus.peers }}</strong>
            </div>
            <div class="progress-bar">
              <div class="progress" :style="{ width: formattedStatus.progressPercentage + '%' }"></div>
              <span class="progress-text">{{ formattedStatus.progressPercentage }}%</span>
            </div>
          </div>
        </div>
      </div>

      <button @click="clearAll" class="secondary-btn">清除当前种子</button>
    </div>
  </div>
</template>

<script>
import { mapState, mapGetters, mapActions } from 'vuex'

export default {
  name: 'TorrentPlayer',
  data() {
    return {
      magnetLink: ''
    }
  },
  computed: {
    ...mapState(['torrentInfo', 'currentFile', 'loading', 'error', 'streamStatus']),
    ...mapGetters(['mediaFiles', 'formattedStatus']),
    videoUrl() {
      if (!this.currentFile || !this.torrentInfo) return ''
      return `http://localhost:3000/api/stream/${this.torrentInfo.infoHash}/${this.currentFile.index}`
    }
  },
  methods: {
    ...mapActions(['getTorrentInfo', 'selectFile', 'clearTorrent', 'stopStatusPolling']),
    async loadTorrent() {
      if (!this.magnetLink || this.loading) return
      
      try {
        await this.getTorrentInfo(this.magnetLink)
        // 如果只有一个媒体文件，自动播放
        if (this.mediaFiles.length === 1) {
          this.playFile(this.mediaFiles[0].index)
        }
      } catch (error) {
        console.error('加载种子失败', error)
      }
    },
    playFile(fileIndex) {
      this.selectFile(fileIndex)
    },
    formatFileSize(bytes) {
      if (bytes === 0) return '0 B'
      
      const k = 1024
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    },
    clearAll() {
      this.clearTorrent()
      this.magnetLink = ''
    }
  },
  beforeUnmount() {
    // 组件销毁前停止状态轮询
    this.stopStatusPolling()
  }
}
</script>

<style scoped>
.torrent-player {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 2rem;
  max-width: 1000px;
  margin: 0 auto;
}

.input-section {
  margin-bottom: 2rem;
}

.input-section h2 {
  margin-bottom: 1rem;
  color: #333;
}

.input-group {
  display: flex;
  gap: 10px;
}

input {
  flex: 1;
  padding: 12px 15px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
  outline: none;
  transition: border-color 0.3s;
}

input:focus {
  border-color: #1e88e5;
}

.primary-btn {
  background-color: #1e88e5;
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  transition: background-color 0.3s;
}

.primary-btn:hover:not(:disabled) {
  background-color: #1565c0;
}

.primary-btn:disabled {
  background-color: #90caf9;
  cursor: not-allowed;
}

.secondary-btn {
  background-color: #f5f5f5;
  color: #333;
  border: 1px solid #ddd;
  padding: 10px 15px;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 1rem;
}

.secondary-btn:hover {
  background-color: #e0e0e0;
}

.error-message {
  color: #d32f2f;
  margin-top: 10px;
  font-size: 14px;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.spinner {
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top: 4px solid #1e88e5;
  width: 40px;
  height: 40px;
  margin-bottom: 1rem;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.content-section {
  margin-top: 2rem;
}

.torrent-info {
  margin-bottom: 1.5rem;
}

.no-media {
  background-color: #ffecb3;
  padding: 1rem;
  border-radius: 4px;
  margin-top: 1rem;
}

.files-container {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 2rem;
}

.files-list {
  min-height: 200px;
}

.files-list h3 {
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #eee;
}

.files-list ul {
  list-style: none;
  max-height: 400px;
  overflow-y: auto;
}

.files-list li {
  padding: 10px;
  margin-bottom: 5px;
  background-color: #f9f9f9;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
  display: flex;
  justify-content: space-between;
}

.files-list li:hover {
  background-color: #eef5fd;
}

.files-list li.active {
  background-color: #e3f2fd;
  border-left: 3px solid #1e88e5;
}

.file-name {
  flex: 1;
  word-break: break-all;
}

.file-size {
  color: #757575;
  font-size: 0.9em;
  margin-left: 10px;
}

.player-container {
  display: flex;
  flex-direction: column;
}

.player-container h3 {
  margin-bottom: 1rem;
  word-break: break-all;
}

.video-player {
  width: 100%;
  background-color: black;
  border-radius: 4px;
  max-height: 400px;
}

.status-panel {
  margin-top: 1rem;
  background-color: #f5f5f5;
  padding: 1rem;
  border-radius: 4px;
}

.status-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.progress-bar {
  height: 20px;
  background-color: #e0e0e0;
  border-radius: 10px;
  margin-top: 1rem;
  position: relative;
  overflow: hidden;
}

.progress {
  height: 100%;
  background-color: #1e88e5;
  transition: width 0.3s ease;
}

.progress-text {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  text-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
}

@media (max-width: 768px) {
  .files-container {
    grid-template-columns: 1fr;
  }
  
  .input-group {
    flex-direction: column;
  }
  
  .torrent-player {
    padding: 1rem;
  }
}
</style> 