import { createStore } from 'vuex'
import axios from 'axios'

const API_URL = 'http://localhost:3000/api'

export default createStore({
  state: {
    torrents: [],
    currentTorrent: null,
    files: [],
    loading: false,
    error: null
  },
  mutations: {
    SET_LOADING(state, status) {
      state.loading = status
    },
    SET_ERROR(state, error) {
      state.error = error
    },
    SET_TORRENTS(state, torrents) {
      state.torrents = torrents
    },
    SET_CURRENT_TORRENT(state, torrent) {
      state.currentTorrent = torrent
    },
    SET_FILES(state, files) {
      state.files = files
    },
    ADD_TORRENT(state, torrent) {
      state.torrents.push(torrent)
    }
  },
  actions: {
    async fetchTorrents({ commit }) {
      commit('SET_LOADING', true)
      try {
        const response = await axios.get(`${API_URL}/torrents`)
        commit('SET_TORRENTS', response.data.torrents)
      } catch (error) {
        commit('SET_ERROR', '获取种子列表失败')
        console.error('获取种子列表失败:', error)
      } finally {
        commit('SET_LOADING', false)
      }
    },
    async fetchTorrent({ commit }, infoHash) {
      commit('SET_LOADING', true)
      try {
        const response = await axios.get(`${API_URL}/torrent/${infoHash}`)
        commit('SET_CURRENT_TORRENT', response.data.torrent)
      } catch (error) {
        commit('SET_ERROR', '获取种子详情失败')
        console.error('获取种子详情失败:', error)
      } finally {
        commit('SET_LOADING', false)
      }
    },
    async fetchFiles({ commit }, infoHash) {
      commit('SET_LOADING', true)
      try {
        const response = await axios.get(`${API_URL}/files/${infoHash}`)
        commit('SET_FILES', response.data.files)
      } catch (error) {
        commit('SET_ERROR', '获取文件列表失败')
        console.error('获取文件列表失败:', error)
      } finally {
        commit('SET_LOADING', false)
      }
    },
    async addMagnet({ commit }, magnetURI) {
      commit('SET_LOADING', true)
      try {
        await axios.post(`${API_URL}/magnet`, { magnetURI })
        // 添加成功后刷新种子列表
        setTimeout(() => {
          this.dispatch('fetchTorrents')
        }, 1000) // 给服务器一点时间处理磁力链接
      } catch (error) {
        commit('SET_ERROR', '添加磁力链接失败')
        console.error('添加磁力链接失败:', error)
      } finally {
        commit('SET_LOADING', false)
      }
    },
    async removeTorrent({ commit, dispatch }, infoHash) {
      commit('SET_LOADING', true)
      try {
        await axios.delete(`${API_URL}/torrent/${infoHash}`)
        // 删除成功后刷新种子列表
        dispatch('fetchTorrents')
      } catch (error) {
        commit('SET_ERROR', '删除种子失败')
        console.error('删除种子失败:', error)
      } finally {
        commit('SET_LOADING', false)
      }
    }
  },
  getters: {
    isLoading: state => state.loading,
    hasError: state => state.error !== null,
    errorMessage: state => state.error,
    allTorrents: state => state.torrents,
    currentTorrent: state => state.currentTorrent,
    torrentFiles: state => state.files,
    videoFiles: state => state.files.filter(file => file.isVideo)
  }
}) 