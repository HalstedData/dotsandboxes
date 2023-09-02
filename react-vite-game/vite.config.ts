import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'


// https://vitejs.dev/config/
export default defineConfig({
  base: '/dotsandboxes/',
  resolve: {
    alias: {
      '@backend': '../../node-ws-server/src/*',
    },
  },
  plugins: [react(), tsconfigPaths()],
})
