import { createStore } from 'vuex'
import axios from 'axios'

const API_URL = 'http://localhost:3000/api'

export default createStore({
  state: {
    torrentInfo: null,
    currentFile: null,
    loading: false,
    error: null,
    streamStatus: null,
    statusInterval: null
  },
  getters: {
    mediaFiles(state) {
      if (!state.torrentInfo || !state.torrentInfo.files) return []
      return state.torrentInfo.files.filter(file => file.isMedia)
    },
    formattedStatus(state) {
      if (!state.streamStatus) return null
      
      return {
        ...state.streamStatus,
        downloadSpeedFormatted: formatBytes(state.streamStatus.downloadSpeed) + '/s',
        uploadSpeedFormatted: formatBytes(state.streamStatus.uploadSpeed) + '/s',
        downloadedFormatted: formatBytes(state.streamStatus.downloaded),
        progressPercentage: Math.round(state.streamStatus.progress * 100)
      }
    }
  },
  mutations: {
    SET_TORRENT_INFO(state, info) {
      state.torrentInfo = info
    },
    SET_CURRENT_FILE(state, file) {
      state.currentFile = file
    },
    SET_LOADING(state, isLoading) {
      state.loading = isLoading
    },
    SET_ERROR(state, error) {
      state.error = error
    },
    SET_STREAM_STATUS(state, status) {
      state.streamStatus = status
    },
    SET_STATUS_INTERVAL(state, interval) {
      state.statusInterval = interval
    }
  },
  actions: {
    async getTorrentInfo({ commit }, magnetLink) {
      commit('SET_LOADING', true)
      commit('SET_ERROR', null)
      
      try {
        const response = await axios.get(`${API_URL}/torrent-info`, {
          params: { magnet: magnetLink }
        })
        
        commit('SET_TORRENT_INFO', response.data)
        return response.data
      } catch (error) {
        console.error('获取种子信息失败:', error)
        commit('SET_ERROR', '获取种子信息失败，请检查磁力链接是否有效')
        throw error
      } finally {
        commit('SET_LOADING', false)
      }
    },
    selectFile({ commit, state, dispatch }, fileIndex) {
      const file = state.torrentInfo.files.find(f => f.index === fileIndex)
      if (!file) return
      
      commit('SET_CURRENT_FILE', file)
      
      // 启动状态轮询
      dispatch('startStatusPolling')
    },
    async getStreamStatus({ commit, state }) {
      if (!state.torrentInfo) return
      
      try {
        const response = await axios.get(`${API_URL}/status/${state.torrentInfo.infoHash}`)
        commit('SET_STREAM_STATUS', response.data)
      } catch (error) {
        console.error('获取状态失败:', error)
      }
    },
    startStatusPolling({ commit, dispatch, state }) {
      // 先清除可能存在的轮询
      if (state.statusInterval) {
        clearInterval(state.statusInterval)
      }
      
      // 立即获取一次状态
      dispatch('getStreamStatus')
      
      // 设置新的轮询，每秒更新一次
      const interval = setInterval(() => {
        dispatch('getStreamStatus')
      }, 1000)
      
      commit('SET_STATUS_INTERVAL', interval)
    },
    stopStatusPolling({ commit, state }) {
      if (state.statusInterval) {
        clearInterval(state.statusInterval)
        commit('SET_STATUS_INTERVAL', null)
      }
    },
    clearTorrent({ commit, dispatch }) {
      dispatch('stopStatusPolling')
      commit('SET_TORRENT_INFO', null)
      commit('SET_CURRENT_FILE', null)
      commit('SET_STREAM_STATUS', null)
    }
  }
})

// 格式化字节数为可读字符串
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i]
} 