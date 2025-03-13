<template>
  <div class="player-container">
    <el-card v-if="fileInfo">
      <template #header>
        <div class="card-header">
          <h2>{{ fileInfo.name }}</h2>
          <div>
            <el-button type="primary" @click="goBack">返回</el-button>
            <el-button type="success" @click="downloadFile">下载</el-button>
          </div>
        </div>
      </template>
      
      <div class="player-wrapper">
        <video 
          v-if="fileInfo.isVideo" 
          ref="videoPlayer" 
          controls 
          autoplay
          class="video-player"
        >
          <source :src="streamUrl" :type="fileInfo.type">
          您的浏览器不支持HTML5视频播放。
        </video>
        
        <audio 
          v-else-if="fileInfo.isAudio" 
          ref="audioPlayer" 
          controls 
          autoplay
          class="audio-player"
        >
          <source :src="streamUrl" :type="fileInfo.type">
          您的浏览器不支持HTML5音频播放。
        </audio>
        
        <div v-else class="unsupported-file">
          <el-alert
            title="不支持的文件类型"
            type="warning"
            description="此文件类型不支持在线播放，请使用下载功能。"
            show-icon
            :closable="false"
          />
        </div>
      </div>
      
      <div class="file-info">
        <el-descriptions title="文件信息" :column="2" border>
          <el-descriptions-item label="文件名">{{ fileInfo.name }}</el-descriptions-item>
          <el-descriptions-item label="大小">{{ formatBytes(fileInfo.length) }}</el-descriptions-item>
          <el-descriptions-item label="类型">{{ fileInfo.type }}</el-descriptions-item>
          <el-descriptions-item label="路径">{{ fileInfo.path }}</el-descriptions-item>
        </el-descriptions>
      </div>
    </el-card>
    
    <el-card v-else-if="loading">
      <el-skeleton :rows="10" animated />
    </el-card>
    
    <el-card v-else>
      <el-result
        icon="error"
        title="未找到文件"
        sub-title="请确认您访问的文件是否存在"
      >
        <template #extra>
          <el-button type="primary" @click="goHome">返回首页</el-button>
        </template>
      </el-result>
    </el-card>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useStore } from 'vuex'
import { useRouter, useRoute } from 'vue-router'

export default {
  name: 'Player',
  setup() {
    const store = useStore()
    const router = useRouter()
    const route = useRoute()
    const videoPlayer = ref(null)
    const audioPlayer = ref(null)
    
    const infoHash = computed(() => route.params.infoHash)
    const fileIndex = computed(() => parseInt(route.params.fileIndex))
    
    // 从Vuex获取状态
    const loading = computed(() => store.getters.isLoading)
    const currentTorrent = computed(() => store.getters.currentTorrent)
    
    // 计算属性：当前文件信息
    const fileInfo = computed(() => {
      if (!currentTorrent.value || !currentTorrent.value.files) return null
      
      return currentTorrent.value.files.find(file => file.index === fileIndex.value)
    })
    
    // 计算属性：流媒体URL
    const streamUrl = computed(() => {
      if (!infoHash.value || fileIndex.value === undefined) return ''
      
      return `http://localhost:3000/api/stream/${infoHash.value}/${fileIndex.value}`
    })
    
    // 组件加载时获取种子信息
    onMounted(() => {
      if (infoHash.value) {
        store.dispatch('fetchTorrent', infoHash.value)
      }
    })
    
    // 格式化文件大小
    const formatBytes = (bytes, decimals = 2) => {
      if (bytes === 0) return '0 Bytes'
      
      const k = 1024
      const dm = decimals < 0 ? 0 : decimals
      const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
      
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      
      return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
    }
    
    // 返回上一页
    const goBack = () => {
      router.back()
    }
    
    // 返回首页
    const goHome = () => {
      router.push('/')
    }
    
    // 下载文件
    const downloadFile = () => {
      if (!fileInfo.value) return
      
      const a = document.createElement('a')
      a.href = streamUrl.value
      a.download = fileInfo.value.name
      a.target = '_blank'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }
    
    return {
      fileInfo,
      streamUrl,
      loading,
      videoPlayer,
      audioPlayer,
      formatBytes,
      goBack,
      goHome,
      downloadFile
    }
  }
}
</script>

<style scoped>
.player-container {
  max-width: 1200px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h2 {
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.player-wrapper {
  margin: 20px 0;
  display: flex;
  justify-content: center;
}

.video-player {
  width: 100%;
  max-height: 70vh;
  background-color: #000;
}

.audio-player {
  width: 100%;
}

.file-info {
  margin-top: 20px;
}

.unsupported-file {
  width: 100%;
  padding: 40px 0;
}
</style> 