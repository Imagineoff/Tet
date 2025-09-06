let totalVisitors = 0;
let onlineUsers = new Map(); // ip -> timestamp

export default function handler(req, res) {
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;

  const now = Date.now();
  totalVisitors++;

  // Ulož/aktualizuj čas pro IP
  onlineUsers.set(ip, now);

  // Vyčisti staré IP (neaktivní >2 minuty)
  for (let [key, value] of onlineUsers) {
    if (now - value > 2 * 60 * 1000) {
      onlineUsers.delete(key);
    }
  }

  res.status(200).json({
    total: totalVisitors,
    online: onlineUsers.size,
  });
}
