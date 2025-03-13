<template>
  <div class="cache-manager">
    <h2>缓存管理</h2>
    
    <div class="cache-actions">
      <button @click="cleanupAll" class="danger-btn">
        清理所有缓存
      </button>
      
      <div class="cache-status" v-if="statusMessage">
        {{ statusMessage }}
      </div>
    </div>
    
    <div class="cache-info">
      <p>系统将自动清理：</p>
      <ul>
        <li>页面关闭时，当前正在播放的种子缓存</li>
        <li>30分钟未活动的种子引擎</li>
        <li>每24小时自动清理超过1天未访问的缓存目录</li>
      </ul>
    </div>
  </div>
</template>

<script>
import { mapActions } from 'vuex'

export default {
  name: 'CacheManager',
  data() {
    return {
      statusMessage: ''
    }
  },
  methods: {
    ...mapActions(['cleanupAllCache']),
    
    async cleanupAll() {
      this.statusMessage = '正在清理缓存...'
      
      try {
        await this.cleanupAllCache()
        this.statusMessage = '所有缓存已清理完成'
        
        // 3秒后清除状态消息
        setTimeout(() => {
          this.statusMessage = ''
        }, 3000)
      } catch (error) {
        this.statusMessage = '清理缓存失败'
        console.error('清理缓存失败:', error)
      }
    }
  }
}
</script>

<style scoped>
.cache-manager {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
  margin-top: 2rem;
}

.cache-manager h2 {
  margin-bottom: 1rem;
  color: #333;
  border-bottom: 1px solid #eee;
  padding-bottom: 0.5rem;
}

.cache-actions {
  display: flex;
  align-items: center;
  margin-bottom: 1.5rem;
}

.danger-btn {
  background-color: #f44336;
  color: white;
  border: none;
  padding: 10px 15px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  transition: background-color 0.3s;
}

.danger-btn:hover {
  background-color: #d32f2f;
}

.cache-status {
  margin-left: 1rem;
  padding: 5px 10px;
  background-color: #e8f5e9;
  border-radius: 4px;
  font-size: 0.9rem;
}

.cache-info {
  background-color: #f5f5f5;
  padding: 1rem;
  border-radius: 4px;
  font-size: 0.9rem;
}

.cache-info p {
  margin-bottom: 0.5rem;
  font-weight: bold;
}

.cache-info ul {
  margin-left: 1.5rem;
}

.cache-info li {
  margin-bottom: 0.3rem;
}
</style> 