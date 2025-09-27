import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { vuetify } from './plugins/vuetify'
import { VueQueryPlugin } from '@tanstack/vue-query'
import './styles/main.css'
import { showGlobalError } from '@/hooks/useGlobalError'

const app = createApp(App)

app.use(router)

app.use(vuetify)

app.use(VueQueryPlugin)

app.config.errorHandler = (err) => {
  showGlobalError(err)
}

window.addEventListener('unhandledrejection', (e) => {
  showGlobalError(e.reason)
})

window.addEventListener('error', (e) => {
  showGlobalError(e.error || e.message)
})

app.mount('#app')
