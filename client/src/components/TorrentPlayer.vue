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
            ref="videoPlayer"
            class="video-js vjs-default-skin vjs-big-play-centered"
            controls 
            preload="auto"
            playsinline
            data-setup="{}"
          >
            <source :src="videoUrl" :type="currentFile ? getContentType(currentFile.name) : 'video/mp4'">
            您的浏览器不支持HTML5视频
          </video>

          <!-- 播放控制面板 -->
          <div class="player-controls">
            <div class="quality-selector" v-if="availableQualities.length > 1">
              <select v-model="currentQuality" @change="changeQuality">
                <option v-for="quality in availableQualities" :key="quality" :value="quality">
                  {{ quality }}p
                </option>
              </select>
            </div>
            <div class="buffer-status" v-if="buffering">
              <div class="spinner small"></div>
              <span>缓冲中...</span>
            </div>
          </div>

          <!-- 下载状态 -->
          <div class="status-panel" v-if="formattedStatus">
            <div class="status-grid">
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
            </div>
            <div class="progress-bar">
              <div class="progress" :style="{ width: formattedStatus.progressPercentage + '%' }"></div>
              <span class="progress-text">{{ formattedStatus.progressPercentage }}%</span>
            </div>
            <div class="buffer-bar">
              <div class="buffer-progress" :style="{ width: bufferPercentage + '%' }"></div>
            </div>
          </div>
        </div>
      </div>

      <button @click="clearAll" class="secondary-btn">清除当前种子</button>
    </div>
    
    <!-- 添加缓存管理组件 -->
    <cache-manager />
  </div>
</template>

<script>
import { mapState, mapGetters, mapActions } from 'vuex'
import CacheManager from './CacheManager.vue'
import videojs from 'video.js'
import 'video.js/dist/video-js.css'

export default {
  name: 'TorrentPlayer',
  components: {
    CacheManager
  },
  data() {
    return {
      magnetLink: '',
      currentQuality: 'auto',
      availableQualities: ['auto'],
      buffering: false,
      bufferPercentage: 0,
      lastPlayPosition: 0,
      seekTimeout: null,
      player: null
    }
  },
  computed: {
    ...mapState(['torrentInfo', 'currentFile', 'loading', 'error', 'streamStatus']),
    ...mapGetters(['mediaFiles', 'formattedStatus']),
    videoUrl() {
      if (!this.currentFile || !this.torrentInfo) return ''
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? '' 
        : 'http://localhost:3000'
      
      // 添加随机参数避免缓存
      const timestamp = Date.now()
      const random = Math.random().toString(36).substring(7)
      
      return `${baseUrl}/api/stream/${this.torrentInfo.infoHash}/${this.currentFile.index}?t=${timestamp}&r=${random}`
    }
  },
  methods: {
    ...mapActions([
      'getTorrentInfo', 
      'selectFile', 
      'clearTorrent', 
      'stopStatusPolling',
      'cleanupCache',
      'cleanupAllCache'
    ]),
    initVideoPlayer() {
      if (this.player) {
        this.player.dispose()
      }

      this.player = videojs(this.$refs.videoPlayer, {
        controls: true,
        autoplay: true,
        preload: 'auto',
        fluid: true,
        playbackRates: [0.5, 1, 1.5, 2],
        html5: {
          nativeTextTracks: false,
          nativeAudioTracks: false,
          nativeVideoTracks: false
        },
        techOrder: ['html5'],
        sources: [{
          src: this.videoUrl,
          type: this.currentFile ? this.getContentType(this.currentFile.name) : 'video/mp4'
        }]
      });

      // 自定义流式加载
      const tech = this.player.tech();
      if (tech && tech.xhr) {
        tech.xhr.beforeRequest = (options) => {
          options.headers = {
            'Range': `bytes=${options.range.start}-${options.range.end}`,
            'Cache-Control': 'no-cache'
          };
        };
      }

      // 监听缓冲状态
      this.player.on('progress', () => {
        const buffered = this.player.buffered();
        if (buffered.length > 0) {
          const bufferEnd = buffered.end(buffered.length - 1);
          const currentTime = this.player.currentTime();
          this.bufferPercentage = (bufferEnd / this.player.duration()) * 100;
          
          if (bufferEnd - currentTime < 5) {
            this.preloadMore();
          }
        }
      });

      // 监听播放状态
      this.player.on('waiting', () => {
        this.buffering = true;
      });

      this.player.on('playing', () => {
        this.buffering = false;
      });

      // 监听错误
      this.player.on('error', (error) => {
        console.error('视频播放错误:', error);
        this.handleError(error);
      });

      // 监听加载完成
      this.player.on('loadedmetadata', () => {
        this.handleVideoLoaded();
      });

      // 监听时间更新
      this.player.on('timeupdate', () => {
        this.handleTimeUpdate();
      });

      // 监听跳转
      this.player.on('seeking', () => {
        this.handleSeeking();
      });

      this.player.on('seeked', () => {
        this.handleSeeked();
      });
    },
    preloadMore() {
      if (!this.currentFile || !this.torrentInfo) return;
      
      const currentTime = this.player.currentTime();
      const duration = this.player.duration();
      const preloadSize = 30; // 预加载30秒
      
      const range = {
        start: currentTime,
        end: Math.min(currentTime + preloadSize, duration)
      };
      
      // 触发预加载
      const tech = this.player.tech();
      if (tech && tech.xhr) {
        tech.xhr.beforeRequest({
          range: range
        });
      }
    },
    handleVideoLoaded() {
      if (this.player) {
        // 设置初始缓冲大小
        this.player.buffer = 2048;
        // 设置播放速率
        this.player.playbackRate(1.0);
      }
    },
    handleTimeUpdate() {
      if (this.player) {
        this.lastPlayPosition = this.player.currentTime();
      }
    },
    handleSeeking() {
      if (this.seekTimeout) {
        clearTimeout(this.seekTimeout);
      }
      this.buffering = true;
    },
    handleSeeked() {
      this.buffering = false;
      this.seekTimeout = setTimeout(() => {
        if (this.lastPlayPosition === this.player.currentTime()) {
          this.handleError(new Error('播放卡住'));
        }
      }, 5000);
    },
    handleError(error) {
      console.error('视频播放错误:', error);
      this.buffering = false;
      if (this.player) {
        this.player.load();
        this.player.play().catch(console.error);
      }
    },
    changeQuality() {
      if (this.player) {
        this.player.load();
        this.player.play().catch(console.error);
      }
    },
    getContentType(filename) {
      const ext = filename.split('.').pop().toLowerCase();
      const types = {
        'mp4': 'video/mp4',
        'mkv': 'video/x-matroska',
        'avi': 'video/x-msvideo',
        'mov': 'video/quicktime',
        'wmv': 'video/x-ms-wmv',
        'flv': 'video/x-flv',
        'webm': 'video/webm',
        'mpg': 'video/mpeg',
        'mpeg': 'video/mpeg'
      };
      return types[ext] || 'video/mp4';
    },
    async loadTorrent() {
      if (!this.magnetLink || this.loading) return;
      
      try {
        await this.getTorrentInfo(this.magnetLink);
        if (this.mediaFiles.length === 1) {
          this.playFile(this.mediaFiles[0].index);
        }
      } catch (error) {
        console.error('加载种子失败', error);
      }
    },
    playFile(fileIndex) {
      this.selectFile(fileIndex);
      this.$nextTick(() => {
        this.initVideoPlayer();
      });
    },
    formatFileSize(bytes) {
      if (bytes === 0) return '0 B';
      
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },
    async clearAll() {
      if (this.torrentInfo && this.torrentInfo.infoHash) {
        await this.cleanupCache();
      }
      this.clearTorrent();
      this.magnetLink = '';
      if (this.player) {
        this.player.dispose();
        this.player = null;
      }
    },
    // 添加页面关闭前的处理方法
    handleBeforeUnload() {
      // 清理当前种子的缓存
      if (this.torrentInfo && this.torrentInfo.infoHash) {
        // 根据环境动态生成API URL
        const baseUrl = process.env.NODE_ENV === 'production' 
          ? '' // 生产环境使用相对路径
          : 'http://localhost:3000'
        
        // 使用同步方式发送请求
        const xhr = new XMLHttpRequest();
        xhr.open('DELETE', `${baseUrl}/api/cleanup/${this.torrentInfo.infoHash}`, false);
        xhr.send();
      }
    }
  },
  beforeUnmount() {
    // 组件销毁前停止状态轮询
    this.stopStatusPolling();
    
    // 组件销毁前清理缓存
    if (this.torrentInfo && this.torrentInfo.infoHash) {
      this.cleanupCache();
    }
    if (this.seekTimeout) {
      clearTimeout(this.seekTimeout)
    }
    if (this.player) {
      this.player.dispose();
      this.player = null;
    }
  },
  mounted() {
    // 添加页面关闭前的事件监听
    window.addEventListener('beforeunload', this.handleBeforeUnload);
  },
  unmounted() {
    // 移除页面关闭前的事件监听
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
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

.video-js {
  width: 100%;
  height: 400px;
  background-color: black;
  border-radius: 4px;
}

.video-js .vjs-tech {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.video-js .vjs-big-play-button {
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.video-js .vjs-control-bar {
  background-color: rgba(0, 0, 0, 0.7);
}

.video-js .vjs-slider {
  background-color: rgba(255, 255, 255, 0.3);
}

.video-js .vjs-play-progress {
  background-color: #1e88e5;
}

.video-js .vjs-volume-level {
  background-color: #1e88e5;
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

.player-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.5rem;
  padding: 0.5rem;
  background-color: #f5f5f5;
  border-radius: 4px;
}

.quality-selector select {
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: white;
}

.buffer-status {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #666;
}

.spinner.small {
  width: 16px;
  height: 16px;
  border-width: 2px;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.buffer-bar {
  height: 4px;
  background-color: #e0e0e0;
  border-radius: 2px;
  margin-top: 0.5rem;
  overflow: hidden;
}

.buffer-progress {
  height: 100%;
  background-color: #4caf50;
  transition: width 0.3s ease;
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