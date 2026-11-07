// Official FVIB calendar snapshots, checked 07/11/2026.
function teamCalendar(t){
 if(!t)return null;
 if(t.id==='sonferrer-cadete-azul'||searchText(t.name)==='cadete azul')return {id:8259,fixtures:cadetFixtures,title:'Cadete femenina · 2.ª División A'};
 if(t.id==='sonferrer-infantil-azul'||searchText(t.name)==='infantil azul')return {id:8245,fixtures:infantilFixtures,title:'Infantil femenina · 1.ª División'};
 return null;
}
const calendarPanel=document.createElement('section');calendarPanel.className='panel';calendarPanel.id='cadetCalendar';calendarPanel.hidden=true;
calendarPanel.innerHTML='<h2 id="calendarTitle"></h2><p id="calendarDescription"></p><div id="calendarContent"><label>Selecciona el partido<select id="fixtureSelect"></select></label><p id="fixtureDetail" class="notice"></p><div class="actions"><button id="openFixture" class="primary">Abrir partido con este equipo</button><a id="calendarSource" target="_blank" rel="noopener noreferrer">Ver calendario oficial</a></div><p class="notice">Calendario consultado el 07/11/2026. Las fechas y horas pueden cambiar. Hora pendiente cuando no está publicada.</p></div><p id="fixtureMessage" role="status"></p>';
const teamPanel=$('teamSelect').closest('.panel');$('matchSearch').closest('.panel').before(teamPanel);teamPanel.after(calendarPanel);
let displayedCalendar=null;
function fixtureLabel(f){return 'J'+f.round+' · '+spanishDate(f.date)+(f.time?' '+f.time:'')+' · '+f.rival+' · '+f.venue}
function fixtureDetails(){const c=teamCalendar(teams.find(t=>t.id===$('teamSelect').value)),f=c?.fixtures.find(f=>f.id===$('fixtureSelect').value);$('fixtureDetail').textContent=f?'Jornada '+f.round+' · '+spanishDate(f.date)+' · '+(f.time||'Hora pendiente')+' · '+f.venue+' · '+f.rival:''}
function renderTeamCalendar(){
 const t=teams.find(t=>t.id===$('teamSelect').value),c=teamCalendar(t);calendarPanel.hidden=!t;if(!t)return;
 $('calendarTitle').textContent='Calendario · '+t.name;$('calendarContent').hidden=!c;
 $('calendarDescription').textContent=c?'LORACAR CV SON FERRER · '+c.title+' · '+c.fixtures.length+' jornadas':'Este equipo todavía no tiene calendario asociado.';
 $('fixtureMessage').textContent=c?'Selecciona el partido. Se cargarán las jugadoras de '+t.name+'.':'Puedes crear un partido nuevo con su plantilla.';
 if(!c)return;
 if(displayedCalendar!==c.id){$('fixtureSelect').innerHTML=c.fixtures.map(f=>'<option value="'+f.id+'">'+esc(fixtureLabel(f))+'</option>').join('');const next=c.fixtures.find(f=>f.date>=new Date().toLocaleDateString('sv-SE'));if(next)$('fixtureSelect').value=next.id;displayedCalendar=c.id}
 $('calendarSource').href='https://www.voleibolib.net/clasificaciones?id='+c.id;fixtureDetails();
}
$('teamSelect').addEventListener('change',renderTeamCalendar);$('fixtureSelect').onchange=fixtureDetails;
$('openFixture').onclick=()=>{
 const t=teams.find(t=>t.id===$('teamSelect').value),c=teamCalendar(t),f=c?.fixtures.find(f=>f.id===$('fixtureSelect').value);if(!f)return;
 let m=db.find(m=>m.id===f.id)||db.find(m=>m.date===f.date&&searchText(m.rival)===searchText(f.rival)&&searchText(m.category)===searchText(t.name));const existing=!!m;
 if(!m){m=fresh();m.id=f.id;m.rival=f.rival;m.date=f.date;m.category=t.name;m.competition='Insular Escolar Mallorca · '+c.title+' · Liga 2 vueltas';m.venue=f.venue;m.notes='Jornada '+f.round+' · '+spanishDate(f.date)+' · '+(f.time?'Hora: '+f.time:'Hora pendiente de publicación')+'\nCalendario FVIB: https://www.voleibolib.net/clasificaciones?id='+c.id+'\nDatos consultados el 07/11/2026.';m.players=teamPlayers(t);db.unshift(m)}
 current=m;history.length=0;selectedAction=null;selectedReason=null;courtDraftFor=null;$('matchSearch').value='';$('filterDate').value='';save();draw();syncMobileStep();$('fixtureMessage').textContent=existing?'Partido guardado abierto. Se conservan tus estadísticas y jugadoras.':'Partido creado con los datos del calendario y las jugadoras de '+t.name+'.';$('rival').scrollIntoView({behavior:'smooth',block:'center'});
};
renderTeamCalendar();
