import { io, Socket } from "socket.io-client";

export const socket: Socket = io("http://localhost:5000", {
  auth: {
    token: localStorage.getItem("Tocken"),
  },
});
