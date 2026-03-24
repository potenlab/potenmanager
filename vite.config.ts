import { defineConfig } from 'vite'
import path from 'path'
import { execSync } from 'child_process'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

// Auto-increment build number from git commit count
const commitCount = (() => {
  try { return execSync('git rev-list --count HEAD').toString().trim(); }
  catch { return '0'; }
})();

export default defineConfig({
  base: '/',
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(`0.2.${commitCount}`),
  },
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
    // Ensure only one copy of React is bundled (fixes "Invalid hook call"
    // errors caused by packages like react-dnd loading their own React copy)
    dedupe: ['react', 'react-dom'],
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],

  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React
          'vendor-react': ['react', 'react-dom', 'react-router'],
          // UI libraries
          'vendor-ui': ['lucide-react', 'react-dnd', 'react-dnd-html5-backend', 'react-dnd-touch-backend'],
          // Supabase
          'vendor-supabase': ['@supabase/supabase-js'],
          // xlsx (heavy, lazy load candidate)
          'vendor-xlsx': ['xlsx'],
        },
      },
    },
  },
})