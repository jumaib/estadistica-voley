// Keep a durable local queue and a last-acknowledged baseline. Never overwrite
// concurrent edits: compare complete records, then offer to preserve both.
const syncKey='sonferrer-cloud-v1';
let cloudBase={revision:0,data:{matches:[],teams:[]}},cloudBusy=false,cloudTimer,cloudConflict=null;
try{const cached=JSON.parse(localStorage.getItem(syncKey));if(cached&&Number.isInteger(cached.revision)&&validSnapshot(cached.data))cloudBase={...cached,data:{...cached.data,matches:normalizeMatches(cached.data.matches)}}}catch{}
const clone=s=>JSON.parse(JSON.stringify(s));
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function localSnapshot(){return clone({matches:db,teams})}
function cloudStatus(text,state){$('cloudState').textContent=text;$('cloudState').dataset.state=state}
function writeLocal(){try{localStorage.setItem(key,JSON.stringify(db));localStorage.setItem(teamsKey,JSON.stringify(teams));storageOK=true}catch{storageOK=false;$('saveState').textContent='Copia local no disponible: descarga una copia'}}
function acknowledge(revision,data){cloudBase={revision,data:clone(data)};try{localStorage.setItem(syncKey,JSON.stringify(cloudBase))}catch{}}
function mergeSnapshots(base,local,remote,keepBoth=false){
 const merged={matches:[],teams:[]};let conflict=false;
 for(const kind of ['matches','teams']){
  const b=new Map(base[kind].map(r=>[r.id,r])),l=new Map(local[kind].map(r=>[r.id,r])),r=new Map(remote[kind].map(r=>[r.id,r]));
  for(const id of new Set([...r.keys(),...l.keys(),...b.keys()])){
   const bv=b.get(id),lv=l.get(id),rv=r.get(id);
   let chosen;
   if(same(lv,rv))chosen=lv;
   else if(same(lv,bv))chosen=rv;
   else if(same(rv,bv))chosen=lv;
   else {conflict=true;chosen=rv;if(keepBoth&&lv){const copy=clone(lv);copy.id=crypto.randomUUID();if(kind==='matches')copy.rival=(copy.rival+' (copia local)').slice(0,200);else copy.name=(copy.name+' (copia local)').slice(0,100);merged[kind].push(copy)}}
   if(chosen)merged[kind].push(clone(chosen));
  }
 }
 return{data:merged,conflict};
}
function applySnapshot(data){const id=current.id;db=normalizeMatches(clone(data.matches));teams=clone(data.teams);if(!db.length)db=[fresh()];current=db.find(m=>m.id===id)||db[0];history.length=0;writeLocal();draw()}
function queueCloudSave(){clearTimeout(cloudTimer);if(cloudConflict){cloudStatus('Conflicto: conserva ambas versiones','error');return}cloudStatus('Pendiente de guardar en Cloudflare','pending');cloudTimer=setTimeout(()=>void synchronize(),450)}
window.queueCloudSave=queueCloudSave;
async function cloudRequest(method,body){const res=await fetch('/api/state',{method,credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json','X-SonFerrer-Request':'1'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000)});if(res.status===401)throw Error('Inicia sesión para guardar en Cloudflare');const result=await res.json();if(res.status===409)return{conflict:true,...result};if(!res.ok)throw Error(result.error||'No se pudo conectar con Cloudflare');if(result.data)result.data.matches=normalizeMatches(result.data.matches);if(!validSnapshot(result.data)||!Number.isInteger(result.revision))throw Error('Respuesta de sincronización no válida');return result}
async function synchronize(){
 if(cloudBusy||cloudConflict)return;cloudBusy=true;clearTimeout(cloudTimer);cloudStatus('Sincronizando con Cloudflare…','pending');
 try{
  const remote=await cloudRequest('GET');
  // Capture the latest local state after GET, including input made while awaiting it.
  let local=localSnapshot();
  // A fresh browser starts with an empty editor, not a new saved match.
  if(cloudBase.revision===0&&!cloudBase.data.matches.length&&remote.data.matches.length&&local.matches.length===1){
   const m=local.matches[0];if(!m.players.length&&m.status==='En preparación'&&['rival','category','competition','notes'].every(k=>!m[k])&&m.sets.every(s=>s.every(n=>n===''))&&!m.easyBallErrors)local={...local,matches:[]};
  }
  const merged=mergeSnapshots(cloudBase.data,local,remote.data);
  if(merged.conflict){cloudConflict={remote};$('cloudConflict').hidden=false;cloudStatus('Hay cambios en otro dispositivo','error');return}
  if(!same(merged.data,localSnapshot()))applySnapshot(merged.data);
  acknowledge(remote.revision,remote.data);
  const sent=localSnapshot();
  if(same(sent,remote.data)){cloudStatus('Guardado en Cloudflare','saved');return}
  const written=await cloudRequest('PUT',{revision:remote.revision,data:sent});
  if(written.conflict){cloudStatus('Recuperando cambios de otro dispositivo…','pending');cloudTimer=setTimeout(()=>void synchronize(),100);return}
  acknowledge(written.revision,written.data);
  if(same(localSnapshot(),sent))cloudStatus('Guardado en Cloudflare','saved');else queueCloudSave();
 }catch(error){cloudStatus((error.name==='TimeoutError'?'Conexión lenta: cambios pendientes':error.message||'Sin conexión: cambios pendientes')+'. Copia local conservada.','error');cloudTimer=setTimeout(()=>void synchronize(),10000)}finally{cloudBusy=false}
}
$('syncNow').onclick=()=>void synchronize();
$('keepBoth').onclick=()=>{if(!cloudConflict)return;const remote=cloudConflict.remote;const merged=mergeSnapshots(cloudBase.data,localSnapshot(),remote.data,true);applySnapshot(merged.data);acknowledge(remote.revision,remote.data);cloudConflict=null;$('cloudConflict').hidden=true;queueCloudSave()};
window.addEventListener('online',()=>void synchronize());
window.addEventListener('beforeunload',e=>{if(!same(localSnapshot(),cloudBase.data)){e.preventDefault();e.returnValue=''}});
// Pull from the cloud while idle; do not interrupt typing or a pending write.
setInterval(()=>{if(!cloudBusy&&!cloudConflict&&same(localSnapshot(),cloudBase.data)&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))void synchronize()},30000);
void synchronize();

