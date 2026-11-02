import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const source=readFileSync('dist/server/index.js','utf8').replace('export default {','const appWorker = {');
const login=readFileSync('public/login.html','utf8');
const extras={'/login.js':{type:'application/javascript; charset=utf-8',content:readFileSync('public/login.js','utf8')},'/logout.js':{type:'application/javascript; charset=utf-8',content:readFileSync('public/logout.js','utf8')}};
const additions='\nconst LOGIN_HTML='+JSON.stringify(login)+';\nObject.assign(ASSETS,'+JSON.stringify(extras)+');\nASSETS["/index.html"].content=ASSETS["/index.html"].content.replace("</header>","<button id=\\"logout\\" style=\\"margin-left:auto\\">Cerrar sesión</button></header>").replace("</html>","<script src=\\"/logout.js\\"></script></html>");\n';
const output=source+additions+readFileSync('worker/independent-auth.js','utf8');
mkdirSync('dist/cloudflare',{recursive:true});writeFileSync('dist/cloudflare/index.js',output);await import('data:text/javascript;base64,'+Buffer.from(output).toString('base64'));console.log('Aplicación independiente de Cloudflare generada');
