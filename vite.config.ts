import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    watch: {
      // 關鍵修復：嚴格忽略 src-tauri 目錄，防止 Vite 監控 Cargo 編譯生成的 .exe 導致 Windows EBUSY (-4082) 鎖定崩潰
      ignored: ['**/src-tauri/**']
    }
  }
});
