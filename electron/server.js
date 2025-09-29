const express = require('express');
const next = require('next');
const path = require('path');
const { createServer } = require('http');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev, dir: path.join(__dirname, '..') });
const handle = app.getRequestHandler();

const port = process.env.PORT || 3000;

app.prepare().then(() => {
  const server = express();

  // Handle static files
  server.use('/_next', express.static(path.join(__dirname, '../.next')));

  // Handle all other requests with Next.js
  server.all('*', (req, res) => {
    return handle(req, res);
  });

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${port}`);
    console.log('> Electron server is running');
  });
}).catch((ex) => {
  console.error(ex.stack);
  process.exit(1);
});
