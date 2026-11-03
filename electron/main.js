const { app, BrowserWindow, session } = require('electron');
const { spawn } = require('node:child_process');
const { join } = require('node:path');
const http = require('node:http');
const { Client } = require('ssh2');

const IS_PACKAGED = app.isPackaged;
const RES = process.resourcesPath || join(__dirname, '..');
const BACKEND_DIR = IS_PACKAGED ? join(RES, 'backend') : join(__dirname, '..', 'backend');

let backendProc = null;
let win = null;
const sshClients = [];

/** Buka satu tunnel SSH (port-forward lokal) dengan reconnect otomatis */
function openTunnel(name, { host, port, username, password }, localPort, targetHost, targetPort) {
  const net = require('node:net');
  const server = net.createServer((socket) => {
    const conn = new Client();
    conn.on('ready', () => {
      conn.forwardOut('127.0.0.1', 0, targetHost, targetPort, (err, stream) => {
        if (err) { socket.destroy(); return; }
        socket.pipe(stream).pipe(socket);
        stream.on('close', () => socket.destroy());
        socket.on('close', () => conn.end());
      });
    });
    conn.on('error', () => socket.destroy());
    conn.connect({ host, port, username, password, readyTimeout: 20000, keepaliveInterval: 15000 });
    socket.on('error', () => conn.end());
  });
  server.listen(localPort, '127.0.0.1');
  console.log(`[tunnel:${name}] 127.0.0.1:${localPort} -> ${targetHost}:${targetPort} via ${host}`);
}

function startTunnels() {
  const fs = require('node:fs');
  const envFile = join(BACKEND_DIR, '.env');
  const env = {};
  if (fs.existsSync(envFile)) {
    for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m) env[m[1]] = m[2];
    }
  }
  // DB server: lokal 3308 -> server app MySQL
  if (env.DB_SSH_HOST && env.DB_SSH_PASSWORD) {
    openTunnel('db', { host: env.DB_SSH_HOST, port: Number(env.DB_SSH_PORT || 23022), username: env.DB_SSH_USER || 'root', password: env.DB_SSH_PASSWORD }, 3308, '127.0.0.1', 3306);
  }
  // Manifest: lokal 3307 -> 10.1.1.102 MySQL via gateway ipung
  if (env.HOSTAWB_SSH_HOST && env.HOSTAWB_SSH_PASSWORD) {
    const [tHost, tPort] = String(env.HOSTAWB_SSH_FWD || '10.1.1.102:3306').split(':');
    openTunnel('manifest', { host: env.HOSTAWB_SSH_HOST, port: Number(env.HOSTAWB_SSH_PORT || 23022), username: env.HOSTAWB_SSH_USER || 'ipung', password: env.HOSTAWB_SSH_PASSWORD }, 3307, tHost, Number(tPort || 3306));
  }
}

function startBackend() {
  const env = {
    ...process.env,
    ELECTRON_RUN_AS_NODE: '1',
    NODE_ENV: 'production',
    PORT: '3000',
    REMOTE_UPLOADS_SYNC: 'ssh',
    HOSTNAME: '127.0.0.1',
  };
  backendProc = spawn(process.execPath, [join(BACKEND_DIR, 'dist', 'main.js')], { cwd: BACKEND_DIR, env, stdio: ['ignore', 'pipe', 'pipe'] });
  backendProc.stdout.on('data', (d) => console.log(`[backend] ${String(d).trim()}`));
  backendProc.stderr.on('data', (d) => console.error(`[backend] ${String(d).trim()}`));
  backendProc.on('exit', (code) => console.log(`[backend] exited ${code}`));
}

function waitBackend(tries = 60) {
  return new Promise((resolve) => {
    const check = (n) => {
      const req = http.get('http://127.0.0.1:3000/api/health', (res) => { res.resume(); resolve(true); });
      req.on('error', () => (n <= 0 ? resolve(false) : setTimeout(() => check(n - 1), 1000)));
    };
    check(tries);
  });
}

/** Serve web build via HTTP — bundle expo memakai path absolut /_expo/... yang tidak jalan di file:// */
const WEB_PORT = 3210;
function startWebServer() {
  return new Promise((resolve) => {
    const fs = require('node:fs');
    const path = require('node:path');
    const root = join(__dirname, IS_PACKAGED ? 'web' : '..', 'web');
    const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg', '.json': 'application/json', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url ?? '/').split('?')[0]);
    let file = join(root, urlPath === '/' ? 'index.html' : urlPath);
    if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
    fs.readFile(file, (err, data) => {
      if (err) {
        log(`HTTP 404-fallback ${req.url}`);
        fs.readFile(join(root, 'index.html'), (e2, html) => {
          if (e2) { res.writeHead(404).end(); return; }
          res.writeHead(200, { 'content-type': 'text/html' }).end(html);
        });
        return;
      }
      if (urlPath !== '/') log(`HTTP 200 ${urlPath} (${data.length}B, ${types[path.extname(file)] ?? '?'})`);
      res.writeHead(200, { 'content-type': types[path.extname(file)] ?? 'application/octet-stream' }).end(data);
    });
  });
    server.on('error', (e) => { log(`web server error: ${e.message}`); resolve(false); });
    server.listen(WEB_PORT, '127.0.0.1', () => { log(`web server ready on http://127.0.0.1:${WEB_PORT}`); resolve(true); });
  });
}

/** Log ke file (userData/log.txt) supaya bisa dicek saat app blank di mesin user */
function log(line) {
  const fs = require('node:fs');
  const path = require('node:path');
  const msg = `[${new Date().toISOString()}] ${line}\n`;
  console.log(msg.trim());
  try {
    const dir = app.getPath('userData');
    fs.appendFileSync(path.join(dir, 'log.txt'), msg);
  } catch { /* ignore */ }
}

const showErrorPage = (title, detail) => `data:text/html,<body style="font-family:Consolas,monospace;background:#0f172a;color:#f8fafc;padding:40px"><h2 style="color:#fca5a5">${title}</h2><pre style="white-space:pre-wrap">${String(detail).replace(/[<>]/g, '')}</pre><p>Buka log: %APPDATA%\\awbxray-desktop\\log.txt</p></body>`;

async function createWindow() {
  win = new BrowserWindow({
    width: 1440,
    height: 900,
    title: 'AWB X-Ray',
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, sandbox: true },
  });
  // Izinkan share screen / kamera dari konteks file://
  session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
    const { desktopCapturer } = require('electron');
    void desktopCapturer.getSources({ types: ['screen', 'window'] }).then((sources) => {
      callback({ video: sources[0], audio: 'loopback' });
    });
  });
  win.on('closed', () => { win = null; });
  win.webContents.on('did-fail-load', (_e, code, desc, url) => log(`did-fail-load ${code} ${desc} ${url}`));
  win.webContents.on('render-process-gone', (_e, details) => log(`renderer gone: ${details.reason}`));
  win.webContents.on('console-message', (_e, level, message) => log(`console[${level}]: ${message}`));

  const ok = await waitBackend();
  if (!ok) {
    await win.loadURL(showErrorPage('Backend gagal start', 'Periksa koneksi ke server DB (tunnel SSH) lalu jalankan ulang aplikasi.'));
    return;
  }
  // Backend sendiri yang serve web build (backend/web-public) — tanpa static server terpisah
  try {
    await win.loadURL('http://127.0.0.1:3000/');
    log('window loaded');
    if (process.env.DIAG) {
      setTimeout(async () => {
        try {
          const info = await win.webContents.executeJavaScript(`({
            rootChildren: document.getElementById('root')?.children.length ?? -1,
            rootHtmlLen: document.getElementById('root')?.innerHTML.length ?? -1,
            bodyText: document.body.innerText.slice(0, 200),
          })`);
          log(`DIAG ${JSON.stringify(info)}`);
        } catch (e) { log(`DIAG error ${e.message}`); }
        app.quit();
      }, 8000);
    } else {
      win.webContents.openDevTools({ mode: 'detach' });
    }
  } catch (e) {
    log(`loadURL failed: ${e.message}`);
    await win.loadURL(showErrorPage('Gagal memuat UI', e.message));
  }
}

app.whenReady().then(() => {
  startTunnels();
  startBackend();
  void createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) void createWindow(); });
});

app.on('window-all-closed', () => {
  if (backendProc) backendProc.kill();
  for (const c of sshClients) c.end();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => { if (backendProc) backendProc.kill(); });
