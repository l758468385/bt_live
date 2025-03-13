import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/player/:infoHash/:fileIndex',
    name: 'Player',
    component: () => import('../views/Player.vue')
  },
  {
    path: '/torrent/:infoHash',
    name: 'TorrentDetails',
    component: () => import('../views/TorrentDetails.vue')
  }
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

export default router 