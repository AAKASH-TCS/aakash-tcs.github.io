import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Strict CSP for the built site. Fonts are self-hosted and there are no inline
// scripts, so nothing third-party needs to be allowed. (frame-ancestors can't be
// set from a <meta>; Flask sends it as a header.)
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

const injectCsp = {
  name: 'inject-csp',
  apply: 'build', // Vite's dev server relies on inline scripts for HMR.
  transformIndexHtml: (html) =>
    html.replace('<head>', `<head>\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`),
}

// For static hosting, ship the same profile the Flask API serves as /profile.json.
const PROFILE = fileURLToPath(new URL('../backend/app/data/profile.json', import.meta.url))
const emitProfile = {
  name: 'emit-profile',
  apply: 'build',
  generateBundle() {
    if (process.env.VITE_STATIC !== 'true') return
    // Parse first so a broken edit fails the build, not the live site.
    const source = JSON.stringify(JSON.parse(readFileSync(PROFILE, 'utf8')))
    this.emitFile({ type: 'asset', fileName: 'profile.json', source })
  },
}

export default defineConfig({
  plugins: [react(), injectCsp, emitProfile],
  server: {
    port: 5173,
    // Same-origin in dev: the browser talks to Vite, Vite forwards /api to Flask.
    proxy: { '/api': { target: 'http://127.0.0.1:5000', changeOrigin: false } },
  },
  build: { sourcemap: false, assetsInlineLimit: 0 },
})
