import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Vite is the tool that serves the app while we develop and bundles it for
// production. "Plugins" teach Vite extra tricks:
//   - react():       understands JSX (the HTML-like syntax inside .tsx files)
//   - tailwindcss(): turns Tailwind class names like "p-4" into real CSS
// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
})
