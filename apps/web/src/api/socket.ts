import { io } from 'socket.io-client';

const apiUrl =
  import.meta.env.VITE_API_URL ??
  'http://localhost:3000/api/v1';

const socketUrl =
  import.meta.env.VITE_SOCKET_URL ??
  apiUrl.replace(/\/api\/v1\/?$/, '');

export const socket = io(socketUrl, {
  transports: ['websocket'],
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
});
