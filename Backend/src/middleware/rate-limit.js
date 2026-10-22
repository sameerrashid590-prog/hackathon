// Per-process protection. Use a shared store when running multiple API instances.
function rateLimit({ limit, windowMs = 15 * 60 * 1000, maxClients = 10000, now = Date.now }) {
  const clients = new Map();
  return (req, res, next) => {
    const time = now();
    for (const [key, value] of clients) if (value.reset <= time) clients.delete(key);
    const key = req.ip || req.socket.remoteAddress;
    let entry = clients.get(key);
    if (!entry) {
      if (clients.size >= maxClients) {
        res.set("Retry-After", String(Math.ceil(windowMs / 1000)));
        return res.status(429).json({ success: false, message: "Too many requests. Try again later." });
      }
      entry = { count: 0, reset: time + windowMs };
      clients.set(key, entry);
    }
    entry.count++;
    if (entry.count > limit) {
      res.set("Retry-After", String(Math.ceil((entry.reset - time) / 1000)));
      return res.status(429).json({ success: false, message: "Too many attempts. Try again later." });
    }
    next();
  };
}
module.exports = rateLimit;
