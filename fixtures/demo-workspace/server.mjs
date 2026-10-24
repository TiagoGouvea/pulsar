import { createReadStream, existsSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };
createServer((request, response) => {
  const requested = request.url === "/" ? "index.html" : request.url.slice(1);
  const target = path.resolve(process.cwd(), requested);
  if (!target.startsWith(process.cwd()) || !existsSync(target)) { response.writeHead(404).end(); return; }
  response.setHeader("content-type", types[path.extname(target)] ?? "application/octet-stream");
  createReadStream(target).pipe(response);
}).listen(4173, "127.0.0.1", () => console.log("http://127.0.0.1:4173"));
