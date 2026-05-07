import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const args = new Map();

for (let index = 2; index < process.argv.length; index += 2) {
  args.set(process.argv[index], process.argv[index + 1]);
}

const port = Number(args.get('--port') || 4177);
const target = args.get('--target') || 'http://localhost:8080';
const previewPath = path.join(root, 'tools', 'device-preview', 'index.html');

const server = http.createServer(async (req, res) => {
  try {
    const html = await readFile(previewPath, 'utf8');
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(html.replaceAll('__TARGET_URL__', target));
  } catch (error) {
    res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
    res.end(`Device preview failed: ${error.message}`);
  }
});

server.listen(port, () => {
  console.log(`Device preview: http://localhost:${port}`);
  console.log(`Target app: ${target}`);
});
