<template>
  <div class="torrent-details">
    <el-card v-if="currentTorrent">
      <template #header>
        <div class="card-header">
          <h2>{{ currentTorrent.name }}</h2>
          <el-button type="danger" @click="confirmRemove">删除种子</el-button>
        </div>
      </template>
      
      <el-descriptions title="种子信息" :column="2" border>
        <el-descriptions-item label="下载进度">
          <el-progress 
            :percentage="Math.round(currentTorrent.progress * 100)" 
            :status="currentTorrent.progress === 1 ? 'success' : ''" 
          />
        </el-descriptions-item>
        <el-descriptions-item label="下载速度">
          {{ formatBytes(currentTorrent.downloadSpeed) }}/s
        </el-descriptions-item>
        <el-descriptions-item label="连接节点">
          {{ currentTorrent.numPeers }}
        </el-descriptions-item>
        <el-descriptions-item label="已下载">
          {{ formatBytes(currentTorrent.downloaded) }}
        </el-descriptions-item>
        <el-descriptions-item label="剩余时间" v-if="currentTorrent.timeRemaining">
          {{ formatTime(currentTorrent.timeRemaining) }}
        </el-descriptions-item>
      </el-descriptions>
      
      <div class="files-section">
        <h3>文件列表</h3>
        <el-table :data="sortedFiles" style="width: 100%">
          <el-table-column prop="name" label="文件名" min-width="250" />
          <el-table-column label="大小" width="120">
            <template #default="scope">
              {{ formatBytes(scope.row.length) }}
            </template>
          </el-table-column>
          <el-table-column label="类型" width="120">
            <template #default="scope">
              <el-tag :type="getFileTypeTag(scope.row)">
                {{ getFileType(scope.row) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="180">
            <template #default="scope">
              <el-button 
                v-if="scope.row.isVideo || scope.row.isAudio" 
                type="primary" 
                size="small" 
                @click="playFile(scope.row)"
              >
                播放
              </el-button>
              <el-button 
                type="success" 
                size="small" 
                @click="downloadFile(scope.row)"
              >
                下载
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-card>

    <el-card v-else-if="loading">
      <el-skeleton :rows="10" animated />
    </el-card>

    <el-card v-else>
      <el-result
        icon="error"
        title="未找到种子"
        sub-title="请确认您访问的种子是否存在"
      >
        <template #extra>
          <el-button type="primary" @click="goHome">返回首页</el-button>
        </template>
      </el-result>
    </el-card>

    <el-dialog
      v-model="showRemoveDialog"
      title="确认删除"
      width="30%"
    >
      <span>确定要删除此种子吗？这将停止下载并清除所有临时文件。</span>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showRemoveDialog = false">取消</el-button>
          <el-button type="danger" @click="removeTorrent">确认删除</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
import { useStore } from 'vuex'
import { useRouter, useRoute } from 'vue-router'

export default {
  name: 'TorrentDetails',
  setup() {
    const store = useStore()
    const router = useRouter()
    const route = useRoute()
    const showRemoveDialog = ref(false)
    const infoHash = computed(() => route.params.infoHash)
    
    // 从Vuex获取状态
    const currentTorrent = computed(() => store.getters.currentTorrent)
    const loading = computed(() => store.getters.isLoading)
    
    // 计算属性：按照文件类型和大小排序的文件列表
    const sortedFiles = computed(() => {
      if (!currentTorrent.value || !currentTorrent.value.files) return []
      
      return [...currentTorrent.value.files].sort((a, b) => {
        // 首先按类型排序（视频放前面）
        if (a.isVideo && !b.isVideo) return -1
        if (!a.isVideo && b.isVideo) return 1
        // 然后按文件大小排序（大的放前面）
        return b.length - a.length
      })
    })
    
    // 监听路由参数变化，重新获取种子信息
    watch(infoHash, (newInfoHash) => {
      if (newInfoHash) {
        fetchTorrentData(newInfoHash)
      }
    })
    
    // 组件加载时获取种子信息
    onMounted(() => {
      if (infoHash.value) {
        fetchTorrentData(infoHash.value)
      }
    })
    
    // 获取种子数据
    const fetchTorrentData = (hash) => {
      store.dispatch('fetchTorrent', hash)
    }
    
    // 格式化文件大小
    const formatBytes = (bytes, decimals = 2) => {
      if (bytes === 0) return '0 Bytes'
      
      const k = 1024
      const dm = decimals < 0 ? 0 : decimals
      const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
      
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      
      return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
    }
    
    // 格式化时间
    const formatTime = (ms) => {
      if (isNaN(ms) || ms === Infinity) return '计算中...'
      
      const seconds = Math.floor(ms / 1000)
      const minutes = Math.floor(seconds / 60)
      const hours = Math.floor(minutes / 60)
      
      if (hours > 0) {
        return `${hours}时${minutes % 60}分`
      } else if (minutes > 0) {
        return `${minutes}分${seconds % 60}秒`
      } else {
        return `${seconds}秒`
      }
    }
    
    // 获取文件类型标签
    const getFileTypeTag = (file) => {
      if (file.isVideo) return 'success'
      if (file.isAudio) return 'warning'
      return 'info'
    }
    
    // 获取文件类型文本
    const getFileType = (file) => {
      if (file.isVideo) return '视频'
      if (file.isAudio) return '音频'
      return '文件'
    }
    
    // 播放文件
    const playFile = (file) => {
      router.push(`/player/${infoHash.value}/${file.index}`)
    }
    
    // 下载文件
    const downloadFile = (file) => {
      const url = `http://localhost:3000/api/stream/${infoHash.value}/${file.index}`
      const a = document.createElement('a')
      a.href = url
      a.download = file.name
      a.target = '_blank'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }
    
    // 确认删除种子
    const confirmRemove = () => {
      showRemoveDialog.value = true
    }
    
    // 删除种子
    const removeTorrent = () => {
      store.dispatch('removeTorrent', infoHash.value).then(() => {
        showRemoveDialog.value = false
        router.push('/')
      })
    }
    
    // 返回首页
    const goHome = () => {
      router.push('/')
    }
    
    return {
      currentTorrent,
      loading,
      sortedFiles,
      showRemoveDialog,
      formatBytes,
      formatTime,
      getFileTypeTag,
      getFileType,
      playFile,
      downloadFile,
      confirmRemove,
      removeTorrent,
      goHome
    }
  }
}
</script>

<style scoped>
.torrent-details {
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

.files-section {
  margin-top: 20px;
}

h3 {
  color: #409EFF;
  margin-bottom: 15px;
}
</style> 