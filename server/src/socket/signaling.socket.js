
import { getPartnerSocketId } from "../service/matching.service.js";

export const registerSignalingHandlers = (io, socket) => {
  // Relay the WebRTC offer to the currently matched partner.
  socket.on("webrtc:offer", (offer) => {
    const partnerId = getPartnerSocketId(socket.id);

    if (!partnerId || !offer) {
      return socket.emit("signaling:error", {
        message: "No active match or invalid offer",
      });
    }

    io.to(partnerId).emit("webrtc:offer", {
      from: socket.id,
      offer,
    });
  });

  // Relay the WebRTC answer to the currently matched partner.
  socket.on("webrtc:answer", (answer) => {
    const partnerId = getPartnerSocketId(socket.id);

    if (!partnerId || !answer) {
      return socket.emit("signaling:error", {
        message: "No active match or invalid answer",
      });
    }

    io.to(partnerId).emit("webrtc:answer", {
      from: socket.id,
      answer,
    });
  });

  // Relay ICE candidates to the currently matched partner.
  socket.on("webrtc:ice-candidate", (candidate) => {
    const partnerId = getPartnerSocketId(socket.id);

    if (!partnerId || !candidate) {
      return socket.emit("signaling:error", {
        message: "No active match or invalid ICE candidate",
      });
    }

    io.to(partnerId).emit("webrtc:ice-candidate", {
      from: socket.id,
      candidate,
    });
  });
};
