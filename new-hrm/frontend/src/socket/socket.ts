import { io, Socket } from "socket.io-client";

export const socket: Socket = io(import.meta.env.VITE_API_URL || "http://localhost:5000", {
  autoConnect: false,
  withCredentials: true,
  transports: ["websocket", "polling"],
  // Improve stability
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
});