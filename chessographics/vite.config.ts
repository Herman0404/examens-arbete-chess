import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite configuration for the chessographics app.
// The server historyApiFallback is handled automatically by Vite's devServer
// but we need to configure the base for proper SPA routing support.
export default defineConfig({
  plugins: [react()],
  server: {
    // Redirect all 404s back to index.html so React Router can handle client-side routing
    historyApiFallback: true,
  },
});
