import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
const module=await import('data:text/javascript;base64,'+readFileSync('dist/server/index.js').toString('base64'));const worker=module.default;
function database(){const sqlite=new DatabaseSync(':memory:');sqlite.exec(readFileSync('drizzle/0000_cloud_state.sql','utf8'));return{prepare(sql){return{bind(...values){return{async first(){const parameters=[];const query=sql.replace(/\?(\d+)/g,(_,n)=>{parameters.push(values[+n-1]);return'?'});return sqlite.prepare(query).get(...parameters)||null}}}}}}}
const origin='https://club.example';
function req(method='GET',body,user='owner',extra={}){return new Request(origin+'/api/state',{method,headers:{'oai-authenticated-user-id':user,'Origin':origin,'Content-Type':'application/json','X-SonFerrer-Request':'1',...extra},...(body?{body:JSON.stringify(body)}:{})})}
test('D1 stores state, isolates accounts and rejects stale revisions',async()=>{
 const env={DB:database()};const data={matches:[],teams:[]};const first=await worker.fetch(req('GET'),env);assert.deepEqual(await first.json(),{revision:0,data});
 let res=await worker.fetch(req('PUT',{revision:0,data}),env);assert.equal(res.status,200);assert.equal((await res.json()).revision,1);
 res=await worker.fetch(req('PUT',{revision:1,data:{matches:[],teams:[{id:'cadete',name:'Cadete',players:[{number:7,name:'Ana'}]}]}}),env);assert.equal(res.status,200);assert.equal((await res.json()).revision,2);
 res=await worker.fetch(req('PUT',{revision:1,data}),env);assert.equal(res.status,409);
 const get=await (await worker.fetch(req(),env)).json();assert.equal(get.revision,2);assert.equal(get.data.teams[0].name,'Cadete');
 assert.equal((await (await worker.fetch(req('GET',null,'other'),env)).json()).revision,0);
 assert.equal((await worker.fetch(req('PUT',{revision:2,data},'other'),env)).status,409);
});
test('API requires identity, same origin, valid data and bounded body',async()=>{
 const env={DB:database()};assert.equal((await worker.fetch(req('GET',null,''),env)).status,401);
 assert.equal((await worker.fetch(req('PUT',{revision:0,data:{matches:[],teams:[]}},'owner',{Origin:'https://evil.example'}),env)).status,403);
 assert.equal((await worker.fetch(req('PUT',{revision:0,data:{matches:[{}],teams:[]}}),env)).status,400);
 assert.equal((await worker.fetch(req('PUT',{revision:0,data:{matches:[],teams:[]},large:'x'.repeat(1500001)}),env)).status,413);
 assert.equal((await worker.fetch(req('GET'),{})).status,503);
});
test('worker serves the complete app with security headers',async()=>{
 for(const path of ['/','/app.js','/schema.js','/sync.js']){const response=await worker.fetch(new Request(origin+path),{});assert.equal(response.status,200);assert.ok(response.headers.get('Content-Security-Policy'));assert.ok((await response.text()).length>100)}
 assert.equal((await worker.fetch(new Request(origin+'/missing'),{})).status,404);
});
