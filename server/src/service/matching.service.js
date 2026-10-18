const waitingQueue = [];
const activeMatch = new Map();

export const findMatch = (socket) => {
  if (activeMatch.has(socket.id)) return null;
  if (waitingQueue.some((user) => user.id === socket.id)) return null;

  while (waitingQueue.length > 0) {
    const partner = waitingQueue.shift();
    if (
      partner?.connected &&
      partner.id !== socket.id &&
      !activeMatch.has(partner.id)
    ) {
      activeMatch.set(socket.id, partner.id);
      activeMatch.set(partner.id, socket.id);
      return partner;
    }
  }

  waitingQueue.push(socket);
  return null;
};

export const isMatched = (socketId) => activeMatch.has(socketId);

export const getPartnerSocketId = (socketId) => activeMatch.get(socketId) ?? null;

export const exitFromQueue = (socket) => {
  const index = waitingQueue.findIndex((user) => user.id === socket.id);
  if (index !== -1) waitingQueue.splice(index, 1);
};

export const endMatch = (socketId) => {
  const partnerId = activeMatch.get(socketId);
  activeMatch.delete(socketId);
  if (partnerId) activeMatch.delete(partnerId);
  return partnerId ?? null;
};
