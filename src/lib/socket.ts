import { io, Socket } from "socket.io-client";
import { HOST_API } from "@/environment";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(HOST_API, {
      transports: ["websocket", "polling"],
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
    });
  }
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
