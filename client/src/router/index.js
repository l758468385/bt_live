import { createRouter, createWebHistory } from 'vue-router'
import TorrentPlayer from '../components/TorrentPlayer.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: TorrentPlayer
  }
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

export default router 