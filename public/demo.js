// Fictional records only. Reopening the demo preserves the user's trial edits.
function createDemo(){
 const teamId='demo-son-ferrer-v1',matchId='demo-partido-son-ferrer-v1';
 let t=teams.find(t=>t.id===teamId);
 if(!t){
  const names=['Ana Torres','Marta Serra','Lucía Vidal','Paula Roca','Carla Pons','Sara Costa','Alba Soler','Nuria Marín','Elena Ferrer','Julia García','Claudia Puig','Irene Vidal'];
  t={id:teamId,name:'Son Ferrer · EQUIPO DE PRUEBA',players:names.map((name,i)=>({name,number:i+1,role:[6,7].includes(i)?'libero':[1,4].includes(i)?'central':'normal'}))};
  if(!persistTeams([...teams,t]))return;
 }
 let m=db.find(m=>m.id===matchId);
 if(!m){
  m=fresh();m.id=matchId;m.rival='Rival de prueba · DEMO';m.category=t.name;m.competition='Demostración · datos ficticios';m.status='En juego';m.players=teamPlayers(t);m.sets[0]=['12','9'];
  m.notes='PARTIDO DE PRUEBA. Nombres, marcador y estadísticas ficticios para explorar la aplicación. Hay seis jugadoras en pista, dos centrales, dos líberos y cuatro jugadoras más de banquillo. Puedes probar puntos, defensa, relevos y Deshacer.';
  m.court=m.players.slice(0,6).map(p=>p.pid);m.courtConfigured=true;
  m.liberoLinks=m.players.filter(p=>p.role==='libero').flatMap(l=>m.players.filter(p=>p.role==='central').map(c=>({liberoId:l.pid,centralId:c.pid})));
  m.players[0].kill=3;m.players[0].at=5;m.players[0].ace=1;m.players[1].block=2;m.players[2].de=1;m.players[3].rp=4;m.players[3].rt=5;m.players[3].re=1;
  m.courtEvents=[{kind:'lineup',set:0,score:[0,0],at:new Date().toISOString(),players:m.players.slice(0,6).map(courtPerson)}];
  db.unshift(m);
 }
 current=m;courtDraftFor=null;history.length=0;selectedAction=null;selectedReason=null;$('matchSearch').value='';$('filterDate').value='';save();draw();$('teamSelect').value=teamId;editTeam(t);$('teamMessage').textContent='Equipo y partido de prueba abiertos. Todos los datos son ficticios y tus pruebas se guardan en Cloudflare.';
 if(!matchFocus)toggleMatchFocus();
}
$('createDemo').onclick=createDemo;
