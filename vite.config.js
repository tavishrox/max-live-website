import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? ''
const isGitHubPagesBuild = process.env.GITHUB_ACTIONS === 'true'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: isGitHubPagesBuild && repoName ? `/${repoName}/` : '/',
  server: {
    host: '0.0.0.0',
    port: 4173,
    allowedHosts: true,
  },
})
