import ActivityReport from '@/views/ActivityReport.vue'
import HomePage from '@/views/HomePage.vue'
import Leaderboard from '@/views/Leaderboard.vue'
import Player from '@/views/Player.vue'
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'Home',
      component: HomePage,
    },
    {
      path: '/player/:membershipType/:membershipId',
      name: 'Player',
      component: Player,
      props: true,
    },
    {
      path: '/activityreport/:id',
      name: 'ActivityReport',
      component: ActivityReport,
      props: true,
    },
    {
      path: '/leaderboard/:type/:activityId',
      name: 'Leaderboard',
      component: Leaderboard,
      props: true,
    },
  ],
})

export default router
