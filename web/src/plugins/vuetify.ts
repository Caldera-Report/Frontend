import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'

import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

export const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'dark',
    themes: {
      dark: {
        dark: true,
        colors: {
          background: '#000000',
          surface: '#0e0e11',
          primary: '#e0b562',
          'primary-darken-1': '#b88f3b',
          secondary: '#7b848f',
          error: '#ff4d4f',
          info: '#4696d9',
          success: '#2ecc71',
          warning: '#f7b733',
          outline: '#2d2d33',
        },
      },
    },
  },
})
