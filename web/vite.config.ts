import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Em desenvolvimento, o Vite repassa /api e /ws para o back-end (porta 3333).
// Assim o front chama caminhos relativos e não precisa saber onde está a API.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Aceita conexões de outros aparelhos da mesma rede Wi-Fi (para testar no
    // celular pelo endereço "Network" que o Vite mostra ao iniciar).
    host: true,
    proxy: {
      '/api': 'http://localhost:3333',
      '/ws': { target: 'ws://localhost:3333', ws: true },
    },
  },
});
