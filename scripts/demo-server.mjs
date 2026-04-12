import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import http from 'node:http';

const root = resolve(process.cwd());
const port = Number(process.env.PORT || 4173);

const types = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.map': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon',
    '.txt': 'text/plain; charset=utf-8'
};

function send404(res) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
}

function send500(res, error) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`Server error\n${error instanceof Error ? error.message : String(error)}`);
}

function resolvePath(urlPath) {
    const pathname = urlPath === '/' ? '/index.html' : urlPath;
    const safePath = normalize(pathname).replace(/^(\.\.[/\\])+/, '');
    const filePath = resolve(join(root, safePath));

    if (!filePath.startsWith(root)) {
        return null;
    }

    return filePath;
}

const server = http.createServer((req, res) => {
    try {
        const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
        const filePath = resolvePath(url.pathname);

        if (!filePath || !existsSync(filePath)) {
            send404(res);
            return;
        }

        const stats = statSync(filePath);
        if (stats.isDirectory()) {
            const indexFile = join(filePath, 'index.html');
            if (!existsSync(indexFile)) {
                send404(res);
                return;
            }

            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            createReadStream(indexFile).pipe(res);
            return;
        }

        const type = types[extname(filePath)] || 'application/octet-stream';
        res.writeHead(200, {
            'Content-Type': type,
            'Cache-Control': 'no-cache'
        });
        createReadStream(filePath).pipe(res);
    } catch (error) {
        send500(res, error);
    }
});

server.listen(port, () => {
    console.log(`Tiny Engine demo server running at http://localhost:${port}`);
    console.log('Open index.html through the server, not via file://');
});
