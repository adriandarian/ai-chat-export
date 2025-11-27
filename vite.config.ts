import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import path from 'path'

// Import browser-specific manifests
import chromeManifest from './src/manifests/chrome'
import firefoxManifest from './src/manifests/firefox'
import safariManifest from './src/manifests/safari'

// Get the target browser from environment variable
// Usage: BROWSER=firefox vite build
const targetBrowser = process.env.BROWSER || 'chrome'

// Select the appropriate manifest based on target browser
function getManifest() {
  switch (targetBrowser) {
    case 'firefox':
      return firefoxManifest
    case 'safari':
      return safariManifest
    case 'chrome':
    case 'edge':
    case 'opera':
    case 'brave':
    case 'atlas':
    case 'vivaldi':
    case 'arc':
    default:
      // All Chromium-based browsers use the same manifest
      return chromeManifest
  }
}

// Get output directory based on browser
function getOutDir() {
  return `dist/${targetBrowser}`
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    crx({ manifest: getManifest() }),
  ],
  build: {
    outDir: getOutDir(),
    // Ensure clean builds for each browser
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // Consistent chunk naming
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Define browser target for conditional code
  define: {
    __BROWSER_TARGET__: JSON.stringify(targetBrowser),
  },
})
