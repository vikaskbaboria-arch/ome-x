import {
  endMatch,
  exitFromQueue,
  findMatch,
  isMatched,
} from "../service/matching.service.js";

export const registerMatchingHandlers = (io, socket) => {
  socket.on("match:join", () => {
    if (isMatched(socket.id)) return;

    const partner = findMatch(socket);
    if (!partner) {
      socket.emit("match:waiting");
      return;
    }

    socket.emit("match:found", { partnerSocketId: partner.id });
    partner.emit("match:found", { partnerSocketId: socket.id });
  });

  socket.on("match:leave", () => {
    exitFromQueue(socket);
    const partnerId = endMatch(socket.id);
    socket.emit("match:ended");
    if (partnerId) io.to(partnerId).emit("match:ended");
  });

  socket.on("disconnect", () => {
    exitFromQueue(socket);
    const partnerId = endMatch(socket.id);
    if (partnerId) io.to(partnerId).emit("match:ended");
  });
};
