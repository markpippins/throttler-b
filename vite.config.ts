import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@nexus/solscript': path.resolve(__dirname, './typescript/solscript/src/index.ts'),
      '@nexus/projection-core': path.resolve(__dirname, './typescript/projection-core/src/index.ts'),
    },
  },
  server: {
    // Hosts accepted by Vite's Host-header check. It refuses unknown Host
    // values even when bound to 0.0.0.0, so the LAN name comes from the
    // environment (bin/start-nexus-uis.sh installs it) rather than the repo.
    allowedHosts: (process.env.NEXUS_UI_ALLOWED_HOSTS ?? '')
      .split(',')
      .map((h) => h.trim())
      .filter(Boolean),
    host: '0.0.0.0',
    port: 4211,
    strictPort: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 4211,
  },
});
