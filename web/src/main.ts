import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { vuetify } from './plugins/vuetify'
import { VueQueryPlugin } from '@tanstack/vue-query'
import './styles/main.css'

const app = createApp(App)

app.use(router)

app.use(vuetify)

app.use(VueQueryPlugin)

app.mount('#app')
