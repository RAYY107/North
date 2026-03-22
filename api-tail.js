// ── start ─────────────────────────────────────────────────────
function startBotApi() {
  const server = http.createServer(handleRequest);

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`\x1b[33m[BotAPI] ⚠️  Port ${PORT} already in use — retrying on ${parseInt(PORT)+1}\x1b[0m`);
      // Kill the old process by trying the next port
      server.listen(parseInt(PORT) + 1, '127.0.0.1');
    } else {
      console.error('\x1b[31m[BotAPI] Server error:', err.message, '\x1b[0m');
    }
  });

  server.listen(PORT, '127.0.0.1', () => {
    const addr = server.address();
    console.log(`\x1b[36m[BotAPI] ✅ Bot API running on http://127.0.0.1:${addr.port}\x1b[0m`);
    console.log(`\x1b[90m[BotAPI] 🔑 Secret: ${API_SECRET.slice(0,8)}...\x1b[0m`);
  });

  return server;
}

module.exports = { startBotApi };
