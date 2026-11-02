// The Sites dispatcher authenticates visitors and strips untrusted identity
// headers. Rows are scoped to the verified visitor, with same-origin writes.
const MAX_BYTES=1500000;
function json(value,status=200){return Response.json(value,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}})}
async function boundedJSON(request){const reader=request.body?.getReader();if(!reader)throw Error('empty');let size=0;const parts=[];for(;;){const{done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_BYTES){await reader.cancel();throw Error('large')}parts.push(value)}const body=new Uint8Array(size);let offset=0;for(const part of parts){body.set(part,offset);offset+=part.byteLength}return JSON.parse(new TextDecoder().decode(body))}
async function stateAPI(request,env){
 const user=request.headers.get('oai-authenticated-user-id');if(!user)return json({error:'Inicia sesión para acceder a tus estadísticas'},401);
 if(!env.DB)return json({error:'La base de datos no está disponible'},503);
 if(!['GET','PUT'].includes(request.method))return json({error:'Método no permitido'},405);
 if(request.method==='GET'){
  const row=await env.DB.prepare('SELECT revision, payload FROM club_state WHERE owner_id = ?1').bind(user).first();
  return json(row?{revision:row.revision,data:JSON.parse(row.payload)}:{revision:0,data:{matches:[],teams:[]}});
 }
 const origin=request.headers.get('Origin');
 if(origin!==new URL(request.url).origin||request.headers.get('X-SonFerrer-Request')!=='1'||!request.headers.get('Content-Type')?.startsWith('application/json'))return json({error:'Solicitud no permitida'},403);
 let input;try{input=await boundedJSON(request)}catch(e){return json({error:e.message==='large'?'Demasiados datos. Descarga una copia y divide los partidos.':'Contenido no válido'},e.message==='large'?413:400)}
 if(!Number.isSafeInteger(input?.revision)||input.revision<0||!validSnapshot(input.data))return json({error:'Estadísticas no válidas'},400);
 const payload=JSON.stringify(input.data);
 // A single conditional statement makes retries and concurrent devices safe.
 const row=await env.DB.prepare('INSERT INTO club_state (owner_id, revision, payload) SELECT ?1, 1, ?2 WHERE ?3 = 0 OR EXISTS (SELECT 1 FROM club_state WHERE owner_id = ?1) ON CONFLICT(owner_id) DO UPDATE SET payload = excluded.payload, revision = club_state.revision + 1 WHERE club_state.revision = ?3 RETURNING revision').bind(user,payload,input.revision).first();
 if(!row)return json({error:'Hay una versión más reciente en otro dispositivo'},409);
 return json({revision:row.revision,data:input.data});
}
export default {
 async fetch(request,env){
  const path=new URL(request.url).pathname;
  try{
   if(path==='/api/state')return await stateAPI(request,env);
   if(!['GET','HEAD'].includes(request.method))return new Response('Método no permitido',{status:405});
   const asset=ASSETS[path==='/'?'/index.html':path];if(!asset)return new Response('No encontrado',{status:404});
   return new Response(request.method==='HEAD'?null:asset.content,{headers:{'Content-Type':asset.type,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'"}});
  }catch(error){console.error(JSON.stringify({event:'request_failed',path,message:error.message}));return json({error:'No se pudo guardar. Tus cambios siguen en este dispositivo; reintenta la sincronización.'},500)}
 }
};
