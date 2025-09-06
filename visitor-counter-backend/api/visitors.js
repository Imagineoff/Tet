let onlineUsers = 0;
let totalVisitors = 0;

export default function handler(req, res) {
  if(req.method === 'GET') {
    const type = req.query.type || "count";

    if(type === "visit") {
      onlineUsers++;
      totalVisitors++;

      setTimeout(() => { onlineUsers = Math.max(onlineUsers - 1, 0); }, 5*60*1000);

      return res.status(200).json({ online: onlineUsers, total: totalVisitors });
    }

    return res.status(200).json({ online: onlineUsers, total: totalVisitors });
  }

  res.status(405).json({ message: 'Method not allowed' });
}
