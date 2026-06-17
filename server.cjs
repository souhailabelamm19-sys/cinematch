const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors({ origin: "*" }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: false
  },
  transports: ["polling", "websocket"]
});

const rooms = {};

io.on("connection", (socket) => {
  console.log("Utilisateur connecté:", socket.id);

  socket.on("join-room", (roomId) => {
    socket.join(roomId);
    if (!rooms[roomId]) rooms[roomId] = { likes: {} };
    console.log(`${socket.id} a rejoint la salle ${roomId}`);
    io.to(roomId).emit("room-joined", { roomId, users: io.sockets.adapter.rooms.get(roomId)?.size });
  });

  socket.on("swipe", ({ roomId, movieId, dir }) => {
    if (!rooms[roomId]) rooms[roomId] = { likes: {} };
    if (dir === "like") {
      if (!rooms[roomId].likes[movieId]) rooms[roomId].likes[movieId] = [];
      rooms[roomId].likes[movieId].push(socket.id);
      if (rooms[roomId].likes[movieId].length >= 2) {
        io.to(roomId).emit("match", { movieId });
      }
    }
    socket.to(roomId).emit("partner-swiped", { movieId, dir });
  });

  socket.on("disconnect", () => {
    console.log("Utilisateur déconnecté:", socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});