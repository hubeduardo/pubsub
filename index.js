const http = require('http');
const fs = require('fs');
const url = require('url');

// Map of topic -> Set of client response objects
const topics = new Map();

function publish(topic, data) {
  const subs = topics.get(topic);
  if (!subs) return;
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  subs.forEach(res => res.write(payload));
}

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);

  if (req.method === 'GET' && parsed.pathname === '/') {
    fs.createReadStream('./public/index.html').pipe(res);
    return;
  }

  if (req.method === 'GET' && parsed.pathname === '/subscribe') {
    const topic = parsed.query.topic || 'default';
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    res.write('\n');
    let subs = topics.get(topic);
    if (!subs) {
      subs = new Set();
      topics.set(topic, subs);
    }
    subs.add(res);
    req.on('close', () => {
      subs.delete(res);
    });
    return;
  }

  if (req.method === 'POST' && parsed.pathname === '/publish') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { topic = 'default', message } = JSON.parse(body);
        publish(topic, { topic, message });
        res.writeHead(204);
        res.end();
      } catch (err) {
        res.writeHead(400);
        res.end('Invalid JSON');
      }
    });
    return;
  }

  // Serve static files in public folder
  if (req.method === 'GET') {
    const path = `./public${parsed.pathname}`;
    fs.readFile(path, (err, data) => {
      if (err) {
        res.writeHead(404);
        return res.end('Not found');
      }
      res.writeHead(200);
      res.end(data);
    });
    return;
  }

  res.writeHead(404);
  res.end();
});

const port = 3000;
server.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
