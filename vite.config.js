import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Base path must match your GitHub repository name so asset URLs resolve
  // correctly when served from https://username.github.io/VirtualMeadow/
  // Change 'VirtualMeadow' if your repo has a different name.
  base: '/VirtualMeadow/',
  plugins: [react()],
  optimizeDeps: {
    include: ['three'],
  },
})
