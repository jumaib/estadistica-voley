import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
const live=readFileSync('public/live.js','utf8');const schema=readFileSync('public/schema.js','utf8'),app=readFileSync('public/app.js','utf8'),sync=readFileSync('public/sync.js','utf8');
function browserSession(store=new Map(),fetch=async()=>{throw Error('offline')}){
 const els={};const c=vm.createContext({document:{activeElement:null,addEventListener(){},getElementById:id=>els[id]??(els[id]={value:'',textContent:'',innerHTML:'',dataset:{},hidden:true,setAttribute(){},setCustomValidity(){},checkValidity(){return true},reportValidity(){},addEventListener(){},querySelector(){return null}})},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},crypto:webcrypto,console,Date,window:{addEventListener(){}},setTimeout(){return 1},clearTimeout(){},setInterval(){},AbortSignal,fetch});
 vm.runInContext(schema+'\n'+live+'\n'+app,c);return c;
}
test('mobile steps follow action, error reason and assignment without changing match data on navigation',()=>{
 const c=browserSession();vm.runInContext(readFileSync('public/mobile.js','utf8'),c);vm.runInContext(`
 $('add').onclick();const before=statSnapshot();setMobileStep('players');setMobileStep('stats');if(statSnapshot()!==before)throw Error('navigation changed data');
 selectedAction='se';selectedReason=null;syncMobileStep();if($('matchPanel').dataset.mobileStep!=='stats')throw Error('reason step');
 selectedReason='Net';syncMobileStep();if($('matchPanel').dataset.mobileStep!=='players')throw Error('player step');
 recordAction(0,'seNet');syncMobileStep();if($('matchPanel').dataset.mobileStep!=='stats'||current.players[0].seNet!==1)throw Error('return to actions');
 `,c);
});
test('six players plus two marked liberos can receive stats without relays and persist across reloads',()=>{
 const store=new Map(),c=browserSession(store);vm.runInContext(`
 for(let i=0;i<9;i++){$('add').onclick();current.players[i].name='Jugadora '+i}save();const ids=current.players.map(p=>p.pid);changePlayerRole(ids[6],'libero');changePlayerRole(ids[7],'libero');courtDraft=ids.slice(0,8);saveLineup();
 if(current.court.length!==6||current.statsPlayers.length!==8||statsPlayerIds().length!==8)throw Error('six plus two');
 if(!playerLabel(current.players[6]).includes(' · L')||!$('courtChoices').innerHTML.includes('libero-choice'))throw Error('L marker');
 recordAction(6,'de');recordAction(7,'rp');if(current.players[6].de!==1||current.players[7].rp!==1||current.courtEvents.filter(e=>e.kind==='libero'||e.kind==='substitution').length)throw Error('libero stats without relay');
 recordAction(8,'ace');if(current.players[8].ace!==0)throw Error('unselected player');
 $('openCourt').onclick();if(courtDraft.length!==8)throw Error('reopen selection');
 const previous=JSON.stringify(current.statsPlayers);courtDraft=ids;saveLineup();if(JSON.stringify(current.statsPlayers)!==previous||!valid(db))throw Error('more than eight');
 `,c);const reloaded=browserSession(store);vm.runInContext(`if(current.statsPlayers.length!==8||statsPlayerIds().length!==8||current.players[6].de!==1)throw Error('reload eight')`,reloaded);
});
test('sharing passes the full report as a file; unsupported browsers download; cancellation does not',async()=>{
 const c=browserSession();let shared;c.File=File;c.downloads=[];c.navigator={canShare:()=>true,share:async payload=>{shared=payload}};
 vm.runInContext(readFileSync('public/share.js','utf8'),c);vm.runInContext(`current.rival='Sóller & Palma';current.date='2026-11-01';current.notes='Notas completas del partido';$('add').onclick();current.players[0].name='Ana';recordAction(0,'de');download=(...args)=>downloads.push(args);$('shareDialog').showModal=()=>{};`,c);
 await vm.runInContext('shareWordReport()',c);
 assert.equal(shared.files.length,1);assert.equal(shared.text,undefined);assert.equal(shared.files[0].name,'Son-Ferrer-2026-11-01.doc');const contents=await shared.files[0].text();for(const section of ['Ana','Err. defensa','Notas completas del partido','Pista y cambios','01/11/2026'])assert.ok(contents.includes(section));assert.equal(c.downloads.length,0);
 c.navigator={canShare:()=>false};await vm.runInContext('shareWordReport()',c);assert.equal(c.downloads.length,1);assert.ok(c.downloads[0][0].includes('Notas completas del partido'));
 c.navigator={canShare:()=>true,share:async()=>{const error=new Error();error.name='AbortError';throw error}};await vm.runInContext('shareWordReport()',c);assert.equal(c.downloads.length,1);
});
test('statistics clear selection and prevent a second assignment, including team errors',()=>{
 const c=browserSession();vm.runInContext(`
 $('add').onclick();
 const playerClick=()=> $('quickPlayers').onclick({target:{closest:s=>s==='button[data-player]'?{dataset:{player:'0'}}:null}});
 selectedAction='se';selectedReason='Net';playerClick();playerClick();
 if(current.players[0].seNet!==1||+current.sets[0][1]!==1||selectedAction!==null||selectedReason!==null)throw Error('duplicate player assignment');
 selectedAction='rp';playerClick();playerClick();if(current.players[0].rp!==1||selectedAction!==null)throw Error('non-scoring action');
 selectedAction='missed';const teamClick=()=> $('quickPlayers').onclick({target:{closest:s=>s==='button[data-team-error]'?{}:null}});teamClick();teamClick();if(current.easyBallErrors!==1||+current.sets[0][1]!==2||selectedAction!==null)throw Error('duplicate team assignment');
 if(!document.getElementById('quickPlayers').innerHTML.includes('disabled'))throw Error('players not disabled');
 `,c);
});
test('manual subtraction preserves stats, cannot go negative and reopens a corrected match',()=>{
 const c=browserSession();vm.runInContext(`
 $('add').onclick();recordAction(0,'ace');manualPoint(1);const stats=JSON.stringify(current.players);removePoint(0);if(+current.sets[0][0]!==0||JSON.stringify(current.players)!==stats)throw Error('subtract');const n=history.length;removePoint(0);if(+current.sets[0][0]!==0||history.length!==n)throw Error('negative');removePoint(1);if(+current.sets[0][1]!==0)throw Error('away');$('undo').onclick();if(+current.sets[0][1]!==1)throw Error('undo');
 current.sets=[['25','20'],['25','20'],['25','23'],['',''],['','']];current.activeSet=2;current.status='Finalizado';removePoint(0);if(current.status!=='En juego'||result()[0]!==2||+current.sets[2][0]!==24)throw Error('reopen');$('undo').onclick();if(current.status!=='Finalizado'||+current.sets[2][0]!==25)throw Error('restore finish');if(!valid(db))throw Error('valid');
 `,c);
});
test('defense errors score for the rival; fictional demo is valid and idempotent',()=>{
 const c=browserSession();vm.runInContext(readFileSync('public/demo.js','utf8'),c);vm.runInContext(`
 $('matchPanel').classList={toggle(){}};document.body={classList:{toggle(){}}};window.scrollTo=()=>{};
 createDemo();if(current.players.length!==12||current.court.length!==6||current.players.filter(p=>p.role==='libero').length!==2||!valid(db)||!validCloudTeams(teams))throw Error('demo data');
 const id=current.id,n=db.length,teamCount=teams.length,points=+current.sets[0][1],receipts=current.players[2].rt;
 recordAction(2,'de');if(current.players[2].de!==2||+current.sets[0][1]!==points+1||current.players[2].rt!==receipts)throw Error('defense');
 $('undo').onclick();if(current.players[2].de!==1||+current.sets[0][1]!==points)throw Error('defense undo');
 createDemo();if(current.id!==id||db.length!==n||teams.length!==teamCount||!report().includes('Err. defensa'))throw Error('reopen demo');
 `,c);
});
test('libero links persist and one-tap relays never count as normal substitutions',()=>{
 const store=new Map(),c=browserSession(store);vm.runInContext(`
 for(let i=0;i<9;i++){$('add').onclick();current.players[i].name='Jugadora '+i;current.players[i].number=i+1}save();
 const ids=current.players.map(p=>p.pid);changePlayerRole(ids[0],'central');changePlayerRole(ids[3],'central');changePlayerRole(ids[6],'libero');changePlayerRole(ids[7],'libero');
 setLiberoLink(ids[6],0,ids[0]);setLiberoLink(ids[6],1,ids[3]);setLiberoLink(ids[7],0,ids[0]);
 courtDraft=ids.slice(0,6);saveLineup();const score=JSON.stringify(current.sets);liberoRelay(ids[6],ids[0]);if(!current.court.includes(ids[6])||current.court.includes(ids[0])||current.court.length!==6)throw Error('libero enter');
 if(current.courtEvents.filter(e=>e.kind==='substitution').length!==0||JSON.stringify(current.sets)!==score)throw Error('relay counted');
 const before=statSnapshot();liberoRelay(ids[7],ids[0]);makeSubstitution(ids[6],ids[8]);if(statSnapshot()!==before)throw Error('illegal regular libero swap');
 liberoRelay(ids[6],ids[0],true);if(!current.court.includes(ids[0])||current.liberoOn!==null)throw Error('return');
 liberoRelay(ids[6],ids[3]);if(!current.court.includes(ids[6])||current.court.includes(ids[3]))throw Error('second central');$('undo').onclick();if(!current.court.includes(ids[3])||current.liberoOn!==null)throw Error('relay undo');
 makeSubstitution(ids[1],ids[8]);if(current.courtEvents.filter(e=>e.kind==='substitution').length!==1)throw Error('normal count');
 liberoRelay(ids[7],ids[0]);if(!valid(db)||!report().includes('Relevo líbero'))throw Error('validation/report');
 `,c);
 const reloaded=browserSession(store);vm.runInContext(`if(!current.liberoOn||current.liberoLinks.length!==3||current.players.filter(p=>p.role==='libero').length!==2)throw Error('libero persistence');liberoRelay(current.liberoOn.liberoId,current.liberoOn.centralId,true);if(current.courtEvents.filter(e=>e.kind==='substitution').length!==1)throw Error('persisted count');`,reloaded);
});
test('automatic and manual scoring, set changes, deuce, match end and undo',()=>{
 const c=browserSession();vm.runInContext(`
 $('add').onclick();current.players[0].name='Ana';recordAction(0,'ace');if(+current.sets[0][0]!==1)throw Error('ace point');recordAction(0,'seNet');if(+current.sets[0][1]!==1)throw Error('error point');recordAction(0,'rp');if(+current.sets[0][0]!==1||+current.sets[0][1]!==1)throw Error('reception no point');
 manualPoint(0);if(+current.sets[0][0]!==2||current.players[0].ace!==1)throw Error('manual');$('undo').onclick();if(+current.sets[0][0]!==1)throw Error('manual undo');
 current.sets[0]=['24','23'];recordAction(0,'kill');if(current.activeSet!==1||+current.sets[0][0]!==25)throw Error('next set');$('undo').onclick();if(current.activeSet!==0||+current.sets[0][0]!==24||current.players[0].kill!==0)throw Error('set undo');
 current.sets[0]=['24','24'];manualPoint(0);if(current.activeSet!==0)throw Error('deuce');manualPoint(0);if(current.activeSet!==1)throw Error('two point win');
 current.sets=[['25','20'],['25','22'],['24','23'],['',''],['','']];current.activeSet=2;recordAction(0,'block');if(current.status!=='Finalizado'||result()[0]!==3)throw Error('match end');const last=statSnapshot();manualPoint(1);recordAction(0,'aeOut');if(statSnapshot()!==last)throw Error('after match scoring');$('undo').onclick();if(current.status==='Finalizado'||+current.sets[2][0]!==24)throw Error('match undo');
 current.sets=[['25','20'],['20','25'],['25','20'],['20','25'],['14','14']];current.activeSet=4;manualPoint(0);if(current.status==='Finalizado')throw Error('fifth deuce');manualPoint(0);if(current.status!=='Finalizado'||+current.sets[4][0]!==16)throw Error('fifth win');if(!valid(db))throw Error('valid live data');
 `,c);
});
test('court selection, substitutions, bench filtering, undo and persisted history',()=>{
 const store=new Map(),c=browserSession(store);vm.runInContext(`
 for(let i=0;i<7;i++){$('add').onclick();current.players[i].name='Jugador '+i;current.players[i].number=i+1}save();
 courtDraft=current.players.slice(0,6).map(p=>p.pid);saveLineup();if(current.court.length!==6||!current.courtConfigured||current.courtEvents[0].kind!=='lineup')throw Error('lineup');
 recordAction(6,'ace');if(current.players[6].ace!==0)throw Error('bench scored');
 const outgoing=current.players[0].pid,incoming=current.players[6].pid;manualPoint(0);makeSubstitution(outgoing,incoming);if(current.court.includes(outgoing)||!current.court.includes(incoming)||current.courtEvents.at(-1).score[0]!==1)throw Error('substitution');
 recordAction(6,'ace');if(current.players[6].ace!==1)throw Error('incoming stats');$('undo').onclick();$('undo').onclick();if(!current.court.includes(outgoing)||current.court.includes(incoming)||current.courtEvents.length!==1)throw Error('sub undo');
 makeSubstitution(outgoing,incoming);if(!valid(db)||!report().includes('Sale #1'))throw Error('validation/report');
 `,c);const reload=browserSession(store);vm.runInContext(`if(current.court.length!==6||current.courtEvents.length!==2||current.courtEvents[1].kind!=='substitution')throw Error('court reload')`,reload);
});
test('Spanish dates and combined date/opponent searches preserve the open match',()=>{
 const c=browserSession();vm.runInContext(`
 if(spanishDate('2026-11-01')!=='01/11/2026'||parseSpanishDate('01/11/2026')!=='2026-11-01')throw Error('format');
 if(parseSpanishDate('31/02/2026')!==null||parseSpanishDate('29/02/2024')!=='2024-02-29'||parseSpanishDate('29/02/2026')!==null)throw Error('calendar validation');
 current.rival='Sóller';current.date='2026-11-01';db.push({...fresh(),rival:'Palma',date:'2026-11-02'});
 if(filteredMatches('soller','').length!==1||filteredMatches('01/11/2026','').length!==1||filteredMatches('','2026-11-02')[0].rival!=='Palma'||filteredMatches('soller 01/11','').length!==1)throw Error('search');
 const id=current.id;$('matchSearch').value='No existe';list();$('matchList').value='';$('matchList').onchange();if(current.id!==id||!$('matchList').innerHTML.includes('Sin resultados'))throw Error('empty selection');
 $('clearSearch').onclick();if($('matchSearch').value!==''||!$('matchList').innerHTML.includes('01/11/2026'))throw Error('reset');
 $('date').value='03/11/2026';$('date').oninput();if(current.date!=='2026-11-03'||!report().includes('03/11/2026'))throw Error('save/report');
 `,c);
});
test('legacy stats survive; error reasons, team errors and undo persist',()=>{
 const c=browserSession();vm.runInContext(`
 $('add').onclick();current.players[0].name='Ana';
 const clickPlayer=()=> $('quickPlayers').onclick({target:{closest:s=>s==='button[data-player]'?{dataset:{player:'0'}}:null}});
 $('actionPicker').onclick({target:{closest:()=>({dataset:{action:'se'}})}});clickPlayer();if(current.players[0].se!==0)throw Error('reason required');
 $('errorPicker').onclick({target:{closest:()=>({dataset:{reason:'Net'}})}});clickPlayer();
 recordAction(0,'seOut');recordAction(0,'aeOut');recordAction(0,'aeNet');
 if(current.players[0].se!==2||current.players[0].seNet!==1||current.players[0].seOut!==1||current.players[0].ae!==2||current.players[0].at!==2)throw Error('totals');
 recordTeamError();if(current.easyBallErrors!==1||current.players[0].ae!==2)throw Error('collective error');
 $('undo').onclick();if(current.easyBallErrors!==0)throw Error('team undo');$('undo').onclick();if(current.players[0].aeNet!==0||current.players[0].ae!==1||current.players[0].at!==1)throw Error('subtype undo');
 if(!valid(db))throw Error('invalid new fields');
 const legacy=JSON.parse(JSON.stringify(db));delete legacy[0].easyBallErrors;for(const k of detailMetrics)delete legacy[0].players[0][k];legacy[0].players[0].se=4;
 const migrated=normalizeMatches(legacy);if(!valid(migrated)||migrated[0].players[0].se!==4||migrated[0].players[0].seNet!==0)throw Error('legacy');
 if(actionDefs.some(d=>d[0]==='at'||d[0]==='rt'))throw Error('removed actions');
 if(!report().includes('Saque red')||!report().includes('sin clasificar'))throw Error('report breakdown');
 `,c);
});
test('team templates create independent zeroed stats with new fields',()=>{
 const store=new Map(),c=browserSession(store);vm.runInContext(`$('teamName').value='Cadete';$('rosterRows').oninput({target:{dataset:{rosterI:'0',rosterField:'number'},value:'7'}});$('rosterRows').oninput({target:{dataset:{rosterI:'0',rosterField:'name'},value:'Ana'}});$('addRosterPlayer').onclick();$('rosterRows').oninput({target:{dataset:{rosterI:'1',rosterField:'number'},value:'9'}});$('rosterRows').oninput({target:{dataset:{rosterI:'1',rosterField:'name'},value:'Eva'}});$('saveTeam').onclick();$('teamSelect').value=teams[0].id;applyTeam(true);recordAction(0,'aeNet');const previous=current;applyTeam(true);if(current.players[0].aeNet!==0||previous.players[0].aeNet!==1||!valid(db))throw Error('team reset')`,c);
 const reload=browserSession(store);vm.runInContext(`if(teams.length!==1||db.length!==3||current.players[0].aeNet!==0)throw Error('reload')`,reload);
});
test('three way merge preserves unrelated edits, detects collisions and keeps copies',async()=>{
 const c=browserSession();vm.runInContext(sync,c);await new Promise(r=>setImmediate(r));
 vm.runInContext(`
 const match={...fresh(),id:'same'};const base={matches:[match],teams:[]};const local=clone(base),remote=clone(base);local.matches[0].rival='Local';remote.matches[0].rival='Remote';
 if(!mergeSnapshots(base,local,remote).conflict)throw Error('missing conflict');const both=mergeSnapshots(base,local,remote,true).data;if(both.matches.length!==2||both.matches[0].id===both.matches[1].id)throw Error('copies');
 const remote2=clone(base);remote2.matches.push({...fresh(),id:'new'});const merged=mergeSnapshots(base,local,remote2);if(merged.conflict||merged.data.matches.length!==2||!merged.data.matches.some(m=>m.rival==='Local'))throw Error('independent merge');
 const deleted={matches:[],teams:[]};if(mergeSnapshots(base,deleted,base).data.matches.length)throw Error('deletion');if(!mergeSnapshots(base,deleted,remote).conflict)throw Error('delete/edit conflict');
 `,c);
});
test('offline edits upload later and survive a response lost after commit',async()=>{
 let remote={revision:0,data:{matches:[],teams:[]}},offline=true,loseResponse=false;
 const fetch=async(url,options)=>{
  if(offline)throw Error('offline');
  if(options.method==='PUT'){const body=JSON.parse(options.body);if(body.revision!==remote.revision)return Response.json({error:'Conflict'},{status:409});remote={revision:remote.revision+1,data:body.data};if(loseResponse){loseResponse=false;throw Error('connection lost')}}
  return Response.json(remote);
 };
 const store=new Map(),c=browserSession(store,fetch);vm.runInContext(sync,c);await new Promise(r=>setImmediate(r));
 vm.runInContext(`$('add').onclick();current.players[0].name='Ana';recordAction(0,'seNet')`,c);
 offline=false;loseResponse=true;await vm.runInContext('synchronize()',c);assert.equal(remote.data.matches[0].players[0].seNet,1);
 await vm.runInContext('synchronize()',c);assert.equal(remote.data.matches[0].players[0].seNet,1);assert.equal(vm.runInContext("$('cloudState').textContent",c),'Guardado en Cloudflare');
 const next=browserSession(store,fetch);vm.runInContext(sync,next);await new Promise(r=>setImmediate(r));await vm.runInContext('synchronize()',next);assert.equal(vm.runInContext('current.players[0].seNet',next),1);
});


test('setting errors score once, undo, persist, export and migrate old records',()=>{
 const store=new Map(),c=browserSession(store);
 vm.runInContext(`$('add').onclick();current.players[0].name='Prueba';selectedAction='ce';recordAction(0,'ce');if(current.players[0].ce!==1||+current.sets[0][1]!==1||selectedAction!==null)throw Error('setting score');if(!report().includes('Err. colocación')||!validMatches(db))throw Error('report or validation');`,c);
 const reload=browserSession(store);assert.equal(vm.runInContext('current.players[0].ce',reload),1);
 vm.runInContext(`$('undo').onclick();if(current.players[0].ce!==0||+current.sets[0][1]!==0)throw Error('undo setting');delete current.players[0].ce;if(normalizeMatches([current])[0].players[0].ce!==0)throw Error('legacy default');`,c);
});
