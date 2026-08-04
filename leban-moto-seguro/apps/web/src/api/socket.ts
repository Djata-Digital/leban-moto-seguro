import { io } from 'socket.io-client';

const apiUrl =
  import.meta.env.VITE_API_URL ??
  'http://localhost:3000/api/v1';

const socketUrl =
  import.meta.env.VITE_SOCKET_URL ??
  apiUrl.replace(/\/api\/v1\/?$/, '');

export const socket = io(socketUrl, {
  // Permite iniciar por polling e depois migrar para WebSocket.
  // Isso funciona melhor em hospedagens como o Render.
  transports: ['polling', 'websocket'],

  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 2000,
  reconnectionDelayMax: 10000,
  timeout: 30000,
});