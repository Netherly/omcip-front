import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isNgrok = process.env.VITE_USE_NGROK === 'true';
  
  return {
    plugins: [react()],
    server: {
      host: true,
      port: 5173,
      strictPort: true,
      allowedHosts: [
        '.ngrok-free.app',
        '.ngrok.io',
        'localhost',
      ],
      hmr: isNgrok ? false : {
        // HMR работает только для localhost
        protocol: 'ws',
        host: 'localhost',
        port: 5173,
      },
      // Полностью отключаем WebSocket для ngrok
      ...(isNgrok && { ws: false }),
    }
  }
})