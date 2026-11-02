import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {webcrypto} from 'node:crypto';
const worker=(await import('data:text/javascript;base64,'+readFileSync('dist/cloudflare/index.js').toString('base64'))).default;
function db(){const sqlite=new DatabaseSync(':memory:');sqlite.exec(readFileSync('cloudflare-schema.sql','utf8'));const prepare=sql=>({async first(){return sqlite.prepare(sql).get()||null},bind(...v){const params=[];const q=sql.replace(/\?(\d+)/g,(_,n)=>{params.push(v[+n-1]);return'?'});return{async first(){return sqlite.prepare(q).get(...params)||null},async run(){return{meta:sqlite.prepare(q).run(...params)}}}},async run(){return{meta:sqlite.prepare(sql).run()}}});return{sqlite,prepare,async batch(list){sqlite.exec('BEGIN');try{const results=[];for(const s of list)results.push(await s.run());sqlite.exec('COMMIT');return results}catch(e){sqlite.exec('ROLLBACK');throw e}}}}
const origin='https://club.workers.dev',email='owner@example.com',token='a'.repeat(64),password='x';
const hash=async value=>Buffer.from(await webcrypto.subtle.digest('SHA-256',new TextEncoder().encode(value))).toString('hex');
function request(path,method='GET',body,cookie='',headers={}){return new Request(origin+path,{method,headers:{Origin:origin,'Content-Type':'application/json','X-SonFerrer-Request':'1',Cookie:cookie,...headers},...(body?{body:JSON.stringify(body)}:{})})}
test('independent setup, sessions and login protect data without trusting ChatGPT headers',async()=>{
 const DB=db(),env={DB,OWNER_EMAIL:email};DB.sqlite.prepare('INSERT INTO app_bootstrap VALUES(1,?,?,0)').run(await hash(token),Date.now()+60000);
 assert.equal((await worker.fetch(request('/api/state','GET',null,'',{'oai-authenticated-user-id':'owner'}),env)).status,401);
 const loginPage=await (await worker.fetch(request('/'),env)).text();assert.ok(loginPage.includes('Acceso independiente de ChatGPT'));
 assert.equal((await worker.fetch(request('/auth/setup','POST',{email,password,token:'b'.repeat(64)}),env)).status,403);
 const setup=await worker.fetch(request('/auth/setup','POST',{email,password,token}),env);assert.equal(setup.status,200);const cookie=setup.headers.get('Set-Cookie');assert.ok(cookie.includes('HttpOnly; Secure; SameSite=Lax'));const session=cookie.split(';')[0];
 assert.equal((await worker.fetch(request('/api/state','GET',null,session),env)).status,200);
 const app=await (await worker.fetch(request('/','GET',null,session),env)).text();assert.ok(app.includes('id="logout"'));assert.ok(app.includes('/logout.js'));
 assert.notEqual((await worker.fetch(request('/auth/setup','POST',{email,password,token}),env)).status,200);
 assert.equal((await worker.fetch(request('/auth/login','POST',{email,password:'wrong'}),env)).status,401);
 const login=await worker.fetch(request('/auth/login','POST',{email,password}),env);assert.equal(login.status,200);
 assert.equal((await worker.fetch(request('/auth/logout','POST',{},session),env)).status,200);assert.equal((await worker.fetch(request('/api/state','GET',null,session),env)).status,401);
 assert.equal((await worker.fetch(request('/auth/login','POST',{email,password},'',{Origin:'https://evil.example'}),env)).status,403);
});


