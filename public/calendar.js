// Official calendar snapshot: FVIB competition 8259, checked 07/11/2026.
const calendarPanel=document.createElement('section');
calendarPanel.className='panel';calendarPanel.id='cadetCalendar';
calendarPanel.innerHTML='<h2>Calendario · Cadetes 2026/27</h2><p>LORACAR CV SON FERRER · 2.ª División A · 22 jornadas</p><label>Selecciona el partido<select id="fixtureSelect"></select></label><p id="fixtureDetail" class="notice"></p><label>Plantilla para un partido nuevo (opcional)<select id="fixtureTeam"></select></label><div class="actions"><button id="openFixture" class="primary">Abrir partido del calendario</button><a href="https://www.voleibolib.net/clasificaciones?id=8259" target="_blank" rel="noopener noreferrer">Ver calendario oficial</a></div><p class="notice">Calendario consultado el 07/11/2026. Las fechas y horas pueden cambiar; confirma la programación oficial. Hora pendiente cuando no está publicada. Los partidos abiertos se guardan con tus estadísticas.</p><p id="fixtureMessage" role="status"></p>';
const teamPanel=$('teamSelect').closest('.panel');
$('matchSearch').closest('.panel').before(teamPanel);teamPanel.after(calendarPanel);
// The official calendar belongs to Cadete Azul; never show it for another team.
function hasCadetCalendar(t){return t&&(t.id==='sonferrer-cadete-azul'||searchText(t.name)==='cadete azul')}
calendarPanel.querySelector('label:has(#fixtureTeam)').hidden=true;
function renderTeamCalendar(){
 const t=teams.find(t=>t.id===$('teamSelect').value);calendarPanel.hidden=!t;
 if(!t)return;
 calendarPanel.querySelector('h2').textContent='Calendario · '+t.name;
 const linked=hasCadetCalendar(t);
 for(const node of calendarPanel.children)if(node.tagName!=='H2')node.hidden=!linked;
 calendarPanel.querySelector('label:has(#fixtureTeam)').hidden=true;
 $('fixtureTeam').value=t.id;
 $('fixtureMessage').hidden=false;$('fixtureMessage').textContent=linked?'Selecciona el partido. Se cargarán las jugadoras de '+t.name+'.':'Este equipo todavía no tiene calendario asociado. Puedes crear un partido con su plantilla.';
}
$('teamSelect').addEventListener('change',renderTeamCalendar);
function fixtureLabel(f){return 'J'+f.round+' · '+spanishDate(f.date)+(f.time?' '+f.time:'')+' · '+f.rival+' · '+f.venue}
$('fixtureSelect').innerHTML=cadetFixtures.map(f=>'<option value="'+f.id+'">'+esc(fixtureLabel(f))+'</option>').join('');
const nextFixture=cadetFixtures.find(f=>f.date>=new Date().toLocaleDateString('sv-SE'));
if(nextFixture)$('fixtureSelect').value=nextFixture.id;
function fixtureDetails(){const f=cadetFixtures.find(f=>f.id===$('fixtureSelect').value);$('fixtureDetail').textContent='Jornada '+f.round+' · '+spanishDate(f.date)+' · '+(f.time||'Hora pendiente')+' · '+f.venue+' · '+f.rival}
function fixtureTeams(){const value=$('fixtureTeam').value;$('fixtureTeam').innerHTML='<option value="">Sin plantilla · añadir después</option>'+teams.filter(t=>!t.id.startsWith('demo-')).map(t=>'<option value="'+esc(t.id)+'">'+esc(t.name)+'</option>').join('');if(teams.some(t=>t.id===value))$('fixtureTeam').value=value}
$('fixtureTeam').onfocus=fixtureTeams;$('fixtureSelect').onchange=fixtureDetails;
$('openFixture').onclick=()=>{
 const t=teams.find(t=>t.id===$('teamSelect').value),f=cadetFixtures.find(f=>f.id===$('fixtureSelect').value);if(!f||!hasCadetCalendar(t))return;
 let m=db.find(m=>m.id===f.id)||db.find(m=>m.date===f.date&&searchText(m.rival)===searchText(f.rival));
 const existing=!!m;
 if(!m){m=fresh();m.id=f.id;m.rival=f.rival;m.date=f.date;m.category=t.name;m.competition='Insular Escolar Mallorca · Cadete femenina · 2.ª División A · Liga 2 vueltas';m.venue=f.venue;m.notes='Jornada '+f.round+' · '+spanishDate(f.date)+' · '+(f.time?'Hora: '+f.time:'Hora pendiente de publicación')+'\nCalendario FVIB: https://www.voleibolib.net/clasificaciones?id=8259\nDatos consultados el 07/11/2026.';m.players=teamPlayers(t);db.unshift(m)}
 current=m;history.length=0;selectedAction=null;selectedReason=null;courtDraftFor=null;$('matchSearch').value='';$('filterDate').value='';save();draw();syncMobileStep();$('fixtureMessage').textContent=existing?'Partido guardado abierto. Se conservan tus estadísticas y datos.':'Partido creado con los datos del calendario. Puedes revisar los datos y elegir la plantilla.';$('rival').scrollIntoView({behavior:'smooth',block:'center'});
};
fixtureTeams();fixtureDetails();renderTeamCalendar();
