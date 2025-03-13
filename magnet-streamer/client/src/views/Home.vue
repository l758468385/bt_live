<template>
  <div class="home">
    <el-card class="magnet-input-card">
      <h2>输入磁力链接</h2>
      <el-form @submit.prevent="addMagnet">
        <el-input
          v-model="magnetURI"
          placeholder="请输入磁力链接 (magnet:?xt=urn:btih:...)"
          clearable
        >
          <template #append>
            <el-button 
              type="primary" 
              @click="addMagnet" 
              :loading="loading"
            >
              添加
            </el-button>
          </template>
        </el-input>
      </el-form>
    </el-card>

    <el-card class="torrent-list-card" v-if="torrents.length > 0">
      <h2>种子列表</h2>
      <el-table :data="torrents" style="width: 100%">
        <el-table-column prop="name" label="名称" min-width="180" />
        <el-table-column label="进度" width="180">
          <template #default="scope">
            <el-progress 
              :percentage="Math.round(scope.row.progress * 100)" 
              :status="scope.row.progress === 1 ? 'success' : ''" 
            />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120">
          <template #default="scope">
            <el-button 
              type="primary" 
              size="small" 
              @click="viewTorrent(scope.row.infoHash)"
              icon="el-icon-view"
            >
              查看
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card class="torrent-list-card" v-else>
      <el-empty description="没有活动的种子" />
    </el-card>

    <el-dialog 
      v-model="showErrorDialog" 
      title="错误" 
      width="30%"
    >
      <span>{{ errorMessage }}</span>
      <template #footer>
        <el-button @click="showErrorDialog = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'

export default {
  name: 'Home',
  setup() {
    const store = useStore()
    const router = useRouter()
    const magnetURI = ref('')
    const showErrorDialog = ref(false)

    // 从Vuex获取状态
    const loading = computed(() => store.getters.isLoading)
    const torrents = computed(() => store.getters.allTorrents)
    const errorMessage = computed(() => store.getters.errorMessage)
    const hasError = computed(() => store.getters.hasError)

    // 监听错误状态变化
    watch(() => hasError.value, (newValue) => {
      showErrorDialog.value = newValue
    })

    // 组件加载时获取种子列表
    onMounted(() => {
      store.dispatch('fetchTorrents')
    })

    // 添加磁力链接
    const addMagnet = () => {
      if (!magnetURI.value) {
        alert('请输入磁力链接')
        return
      }
      
      store.dispatch('addMagnet', magnetURI.value)
      magnetURI.value = '' // 清空输入框
    }

    // 查看种子详情
    const viewTorrent = (infoHash) => {
      router.push(`/torrent/${infoHash}`)
    }

    return {
      magnetURI,
      loading,
      torrents,
      errorMessage,
      showErrorDialog,
      addMagnet,
      viewTorrent
    }
  }
}
</script>

<style scoped>
.home {
  max-width: 1200px;
  margin: 0 auto;
}

.magnet-input-card,
.torrent-list-card {
  margin-bottom: 20px;
}

h2 {
  margin-top: 0;
  margin-bottom: 20px;
  color: #409EFF;
}
</style> 