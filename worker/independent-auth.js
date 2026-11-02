// Independent authentication for the direct Cloudflare deployment.
const SESSION_COOKIE='__Host-sonferrer-session';
const encoder=new TextEncoder();
const hex=bytes=>Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
async function digest(text){return hex(await crypto.subtle.digest('SHA-256',encoder.encode(text)))}
async function derivePassword(password,salt){const key=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);return hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:encoder.encode(salt),iterations:100000,hash:'SHA-256'},key,256))}
function equalHash(a,b){const aa=encoder.encode(a),bb=encoder.encode(b);if(aa.length!==bb.length)return false;if(crypto.subtle.timingSafeEqual)return crypto.subtle.timingSafeEqual(aa,bb);let diff=0;for(let i=0;i<aa.length;i++)diff|=aa[i]^bb[i];return diff===0}
async function sessionOwner(request,env){const cookie=(request.headers.get('Cookie')||'').split(';').map(p=>p.trim()).find(p=>p.startsWith(SESSION_COOKIE+'='));if(!cookie)return null;const token=cookie.slice(SESSION_COOKIE.length+1);if(!/^[a-f0-9]{64}$/.test(token))return null;const row=await env.DB.prepare('SELECT s.user_id FROM app_sessions s JOIN app_users u ON u.id=s.user_id WHERE s.token_hash=?1 AND s.expires_at>?2').bind(await digest(token),Date.now()).first();return row?.user_id||null}
async function newSession(env){const token=hex(crypto.getRandomValues(new Uint8Array(32))),age=14*24*3600;await env.DB.batch([env.DB.prepare('DELETE FROM app_sessions WHERE expires_at<?1').bind(Date.now()),env.DB.prepare('INSERT INTO app_sessions (token_hash,user_id,expires_at) VALUES (?1,?2,?3)').bind(await digest(token),'owner',Date.now()+age*1000)]);return SESSION_COOKIE+'='+token+'; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age='+age}
function authJSON(data,status=200,cookie){const response=json(data,status);if(cookie)response.headers.set('Set-Cookie',cookie);return response}
async function authAPI(request,env,path){
 if(request.method!=='POST')return authJSON({error:'Método no permitido'},405);
 if(request.headers.get('Origin')!==new URL(request.url).origin||request.headers.get('X-SonFerrer-Request')!=='1'||!request.headers.get('Content-Type')?.startsWith('application/json'))return authJSON({error:'Solicitud no permitida'},403);
 if(path==='/auth/logout'){
  const cookie=(request.headers.get('Cookie')||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(SESSION_COOKIE+'='));if(cookie)await env.DB.prepare('DELETE FROM app_sessions WHERE token_hash=?1').bind(await digest(cookie.slice(SESSION_COOKIE.length+1))).run();
  return authJSON({ok:true},200,SESSION_COOKIE+'=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0');
 }
 if(!['/auth/login','/auth/setup'].includes(path))return authJSON({error:'No encontrado'},404);
 let input;try{input=await boundedJSON(request)}catch{return authJSON({error:'Datos no válidos'},400)}
 if(typeof input.email!=='string'||typeof input.password!=='string'||input.password.length>200||input.email.length>200)return authJSON({error:'Revisa el correo y la contraseña'},400);
 const rateKey=await digest((request.headers.get('CF-Connecting-IP')||'unknown')+':'+Math.floor(Date.now()/900000));
 const attempts=await env.DB.prepare('INSERT INTO auth_attempts (bucket,attempts) VALUES (?1,1) ON CONFLICT(bucket) DO UPDATE SET attempts=attempts+1 RETURNING attempts').bind(rateKey).first();
 if(attempts.attempts>12)return authJSON({error:'Demasiados intentos. Espera 15 minutos y vuelve a probar.'},429);
 const email=input.email.trim().toLowerCase();
 if(path==='/auth/setup'){
  if(input.password.length===0)return authJSON({error:'Escribe una contraseña'},400);
  if(email!==env.OWNER_EMAIL||typeof input.token!=='string'||!/^[a-f0-9]{64}$/.test(input.token))return authJSON({error:'El enlace de activación no es válido'},403);
  const tokenHash=await digest(input.token),valid=await env.DB.prepare('SELECT id FROM app_bootstrap WHERE id=1 AND token_hash=?1 AND expires_at>?2 AND used=0').bind(tokenHash,Date.now()).first();
  if(!valid)return authJSON({error:'El enlace ha caducado o ya se ha utilizado. Entra con tu correo y contraseña.'},403);
  const salt=hex(crypto.getRandomValues(new Uint8Array(24))),hash=await derivePassword(input.password,salt);
  const results=await env.DB.batch([
   env.DB.prepare("INSERT OR IGNORE INTO app_users (id,email,salt,password_hash) SELECT 'owner',?1,?2,?3 WHERE EXISTS (SELECT 1 FROM app_bootstrap WHERE id=1 AND token_hash=?4 AND expires_at>?5 AND used=0)").bind(email,salt,hash,tokenHash,Date.now()),
   env.DB.prepare("UPDATE app_bootstrap SET used=1 WHERE id=1 AND EXISTS (SELECT 1 FROM app_users WHERE id='owner')")
  ]);
  if(!results[0].meta.changes)return authJSON({error:'El acceso ya está configurado. Usa tu correo y contraseña.'},409);
  return authJSON({ok:true},200,await newSession(env));
 }
 const owner=await env.DB.prepare("SELECT email,salt,password_hash FROM app_users WHERE id='owner'").first();
 const hash=await derivePassword(input.password,owner?.salt||'000000000000000000000000000000000000000000000000');
 if(!owner||email!==owner.email||!equalHash(hash,owner.password_hash))return authJSON({error:'Correo o contraseña incorrectos'},401);
 return authJSON({ok:true},200,await newSession(env));
}
export default {
 async fetch(request,env){
  const path=new URL(request.url).pathname;
  try{
   if(path.startsWith('/auth/'))return await authAPI(request,env,path);
   if(path==='/'||path==='/index.html'||path.startsWith('/api/')){
    const user=await sessionOwner(request,env);
    if(!user){if(path.startsWith('/api/'))return json({error:'Tu sesión ha caducado. Inicia sesión con tu correo y contraseña.'},401);return new Response(LOGIN_HTML,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'",'Referrer-Policy':'no-referrer'}})}
    const headers=new Headers(request.headers);headers.set('oai-authenticated-user-id','standalone-owner');headers.delete('oai-authenticated-user-email');
    return await appWorker.fetch(new Request(request,{headers}),env);
   }
   return await appWorker.fetch(request,env);
  }catch(error){console.error(JSON.stringify({event:'auth_request_failed',path,message:error.message}));return json({error:'No se pudo completar la solicitud. Vuelve a intentarlo.'},500)}
 }
};

