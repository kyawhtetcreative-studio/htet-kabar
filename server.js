const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const PORT = Number(process.env.PORT || 3000);
const root = path.join(__dirname, 'public');
const types = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8', '.svg':'image/svg+xml' };
http.createServer((req,res)=>{
  if (req.url === '/api/health') { res.writeHead(200, {'content-type':'application/json'}); return res.end(JSON.stringify({ok:true, app:'HTET KABAR', stage:'MVP scaffold'})); }
  const requested = decodeURIComponent((req.url || '/').split('?')[0]);
  const file = path.join(root, requested === '/' ? 'index.html' : requested.replace(/^\/+/, ''));
  if (!file.startsWith(root)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.readFile(file,(err,data)=>{ if(err){res.writeHead(404);return res.end('Not found');} res.writeHead(200,{'content-type':types[path.extname(file)]||'application/octet-stream'});res.end(data); });
}).listen(PORT,()=>console.log(`HTET KABAR MVP running at http://localhost:${PORT}`));
