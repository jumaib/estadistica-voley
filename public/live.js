let courtDraft=[],courtDraftFor=null;
function renderLiveScore(){
 const active=current.activeSet||0,s=current.sets[active];
 $('activeSet').innerHTML=current.sets.map((set,i)=>'<option value="'+i+'" '+(i===active?'selected':'')+'>Set '+(i+1)+'</option>').join('');
 $('liveScore').textContent=(s[0]||0)+' – '+(s[1]||0);
 const finished=result().some(n=>n>=3)||setWinner(s,active)!==null;
 $('homePoint').disabled=finished;$('awayPoint').disabled=finished;
 $('removeHomePoint').disabled=(+s[0]||0)<=0;$('removeAwayPoint').disabled=(+s[1]||0)<=0;
}
function canScore(){
 const i=current.activeSet||0,s=current.sets[i];
 if(result().some(n=>n>=3)){$('actionStatus').textContent='Partido finalizado. Usa Deshacer o corrige el marcador de sets.';return false}
 if(setWinner(s,i)!==null){$('actionStatus').textContent='Este set ya ha terminado. Selecciona el siguiente set.';return false}
 if(s.some(n=>+n>=199)){$('actionStatus').textContent='Se ha alcanzado el límite del marcador.';return false}
 return true;
}
function addScore(side){
 const i=current.activeSet||0,s=current.sets[i];current.sets[i]=[String(+s[0]||0),String(+s[1]||0)];current.sets[i][side]=String(+current.sets[i][side]+1);
 current.status='En juego';
 if(setWinner(current.sets[i],i)!==null){if(result().some(n=>n>=3))current.status='Finalizado';else if(i<4)current.activeSet=i+1}
 $('status').value=current.status;
}
function manualPoint(side){if(!canScore())return;const before=statSnapshot(),set=(current.activeSet||0)+1;addScore(side);pushHistory(before);save();renderSets();rows();$('actionStatus').textContent='Punto '+(side===0?'Son Ferrer':'rival')+' · Set '+set+' · Sin estadística individual'}
function removePoint(side){
 if(![0,1].includes(side))return;
 const i=current.activeSet||0,points=+current.sets[i][side]||0;
 if(points<=0){$('actionStatus').textContent='No se pueden restar puntos: el marcador ya está a cero.';return}
 const before=statSnapshot();current.sets[i][side]=String(points-1);
 if(result().some(n=>n>=3))current.status='Finalizado';else if(current.status==='Finalizado')current.status='En juego';
 $('status').value=current.status;pushHistory(before);save();renderSets();rows();
 $('actionStatus').textContent='−1 punto '+(side===0?'Son Ferrer':'rival')+' · Set '+(i+1)+' · Corrección del marcador; estadísticas conservadas.';
}
function courtPlayer(id){return current.players.find(p=>p.pid===id)}
function playerLabel(p){return (p.number!==''?'#'+p.number+' · ':'')+(p.name||'Sin nombre')+(p.role==='libero'?' · L':'')}
function courtOption(p){return '<option value="'+esc(p.pid)+'">'+esc(playerLabel(p))+'</option>'}
function renderCourt(){renderLibero();
 if(courtDraftFor!==current.id){courtDraftFor=current.id;courtDraft=[...statsPlayerIds()]}
 courtDraft=courtDraft.filter(id=>courtPlayer(id));
 const on=current.players.filter(p=>current.court.includes(p.pid)&&p.role!=='libero'),bench=current.players.filter(p=>!current.court.includes(p.pid)&&p.role!=='libero'&&p.pid!==current.liberoOn?.centralId);
 $('courtSummary').textContent=current.courtConfigured?'Estadísticas: '+statsPlayerIds().length+'/8 · En pista: '+current.court.length+' · Cambios set '+((current.activeSet||0)+1)+': '+current.courtEvents.filter(e=>e.kind==='substitution'&&e.set===(current.activeSet||0)).length:'Pista sin configurar: se muestran todos los jugadores.';
 $('courtChoices').innerHTML=current.players.map(p=>'<label class="'+(p.role==='libero'?'libero-choice':'')+'"><input type="checkbox" data-court-player="'+esc(p.pid)+'" '+(courtDraft.includes(p.pid)?'checked':'')+'>'+esc(playerLabel(p))+'</label>').join('');
 $('subOut').innerHTML='<option value="">Quién sale</option>'+on.map(courtOption).join('');
 $('subIn').innerHTML='<option value="">Quién entra</option>'+bench.map(courtOption).join('');
 $('makeSub').disabled=!current.courtConfigured||!on.length||!bench.length;
 $('subHistory').innerHTML=[...current.courtEvents].reverse().map(event=>'<div class="sub-log">Set '+(event.set+1)+' · '+esc(event.score.join(' – '))+' · '+(event.kind==='lineup'?'Pista: '+event.players.map(p=>esc(playerLabel(p))).join(', '):(event.kind==='libero'?'Relevo líbero · no cuenta como cambio · ':'')+'Sale '+esc(playerLabel(event.out))+' → Entra '+esc(playerLabel(event.in)))+'</div>').join('')||'<p class="muted">Sin cambios registrados.</p>';
}
function courtEventBase(){return{set:current.activeSet||0,score:current.sets[current.activeSet||0].map(n=>+n||0),at:new Date().toISOString()}}
function courtPerson(p){return{pid:p.pid,name:p.name,number:p.number}}
function saveLineup(){if(current.liberoOn){$('courtMessage').textContent='Pulsa Vuelve la central antes de modificar la alineación.';return}
 const selected=courtDraft.filter(id=>courtPlayer(id)),chosen=selected.filter(id=>courtPlayer(id).role!=='libero'),libs=selected.filter(id=>courtPlayer(id).role==='libero');
 if(!chosen.length||chosen.length>6||libs.length>2||selected.length>8){$('courtMessage').textContent='Selecciona hasta 6 jugadoras de pista y hasta 2 líberos (8 en total).';return}
 if(current.courtEvents.length>=1000){$('courtMessage').textContent='Se ha alcanzado el límite del historial.';return}
 const before=statSnapshot();current.court=[...chosen];current.statsPlayers=[...selected];current.courtConfigured=true;
 current.courtEvents.push({...courtEventBase(),kind:'lineup',players:chosen.map(id=>courtPerson(courtPlayer(id)))});
 pushHistory(before);save();rows();$('courtMessage').textContent='Selección guardada. Las jugadoras y las líberos elegidas están disponibles para asignar estadísticas.';$('courtManager').open=false;
}
function makeSubstitution(outId,inId){
 const out=courtPlayer(outId),incoming=courtPlayer(inId),pos=current.court.indexOf(outId);
 if(!current.courtConfigured||!out||!incoming||out.role==='libero'||incoming.role==='libero'||current.liberoOn?.centralId===inId||pos<0||current.court.includes(inId)){$('courtMessage').textContent='Elige alguien que esté en pista para salir y alguien del banquillo para entrar.';return}
 if(current.courtEvents.length>=1000){$('courtMessage').textContent='Se ha alcanzado el límite del historial.';return}
 const before=statSnapshot(),stats=statsPlayerIds();current.court[pos]=inId;current.statsPlayers=stats.map(id=>id===outId?inId:id);courtDraft=[...statsPlayerIds()];
 current.courtEvents.push({...courtEventBase(),kind:'substitution',out:courtPerson(out),in:courtPerson(incoming)});
 pushHistory(before);save();rows();$('courtMessage').textContent='Cambio guardado: sale '+playerLabel(out)+' y entra '+playerLabel(incoming);$('actionStatus').textContent=$('courtMessage').textContent;$('courtManager').open=false;
}
function courtReport(){return '<h3>Pista y cambios</h3><p>En pista al cerrar el informe: '+(current.court.map(courtPlayer).filter(Boolean).map(p=>esc(playerLabel(p))).join(', ')||'Sin configurar')+'</p>'+current.courtEvents.map(event=>'<p>Set '+(event.set+1)+' · '+event.score.join(' – ')+' · '+(event.kind==='lineup'?'Pista: '+event.players.map(p=>esc(playerLabel(p))).join(', '):(event.kind==='libero'?'Relevo líbero · no cuenta como cambio · ':'')+'Sale '+esc(playerLabel(event.out))+' → Entra '+esc(playerLabel(event.in)))+'</p>').join('')}
function initializeLive(){initializeLibero();
 $('homePoint').onclick=()=>manualPoint(0);$('awayPoint').onclick=()=>manualPoint(1);
 $('removeHomePoint').onclick=()=>removePoint(0);$('removeAwayPoint').onclick=()=>removePoint(1);
 $('activeSet').onchange=()=>{const i=+$('activeSet').value;if(!Number.isInteger(i)||i<0||i>4)return;current.activeSet=i;history.length=0;save();quickRows()};
 $('openCourt').onclick=()=>{$('courtManager').open=!$('courtManager').open;if($('courtManager').open){courtDraft=[...statsPlayerIds()];courtDraftFor=current.id;renderCourt()}};
 $('courtChoices').onchange=e=>{const id=e.target.dataset.courtPlayer,p=courtPlayer(id);if(!p)return;if(e.target.checked){const sameRole=courtDraft.filter(x=>(courtPlayer(x)?.role==='libero')===(p.role==='libero')).length;if(courtDraft.length>=8||sameRole>=(p.role==='libero'?2:6)){e.target.checked=false;$('courtMessage').textContent='Máximo 6 jugadoras de pista y 2 líberos: 8 para estadísticas.';return}if(!courtDraft.includes(id))courtDraft.push(id)}else courtDraft=courtDraft.filter(x=>x!==id);$('courtMessage').textContent=courtDraft.length+' de 8 seleccionadas. Pulsa Confirmar para guardar.'};
 $('saveCourt').onclick=saveLineup;$('makeSub').onclick=()=>makeSubstitution($('subOut').value,$('subIn').value);
}

function renderLibero(){
 $('playerRoles').innerHTML=current.players.map(p=>'<label class="role-row"><span>'+esc(playerLabel(p))+'</span><select data-player-role="'+esc(p.pid)+'" aria-label="Posición de '+esc(p.name)+'">'+['normal','central','libero'].map(r=>'<option value="'+r+'" '+(p.role===r?'selected':'')+'>'+({normal:'Otra',central:'Central',libero:'Líbero'}[r])+'</option>').join('')+'</select></label>').join('');
 const liberos=current.players.filter(p=>p.role==='libero'),centrals=current.players.filter(p=>p.role==='central');
 $('liberoLinksEditor').innerHTML=liberos.map(l=>{const links=current.liberoLinks.filter(x=>x.liberoId===l.pid);return '<div class="libero-link"><strong>'+esc(playerLabel(l))+' · Líbero</strong>'+[0,1].map((slot)=>'<label>Central '+(slot+1)+'<select data-link-libero="'+esc(l.pid)+'" data-link-slot="'+slot+'"><option value="">Sin vincular</option>'+centrals.map(c=>'<option value="'+esc(c.pid)+'" '+(links[slot]?.centralId===c.pid?'selected':'')+'>'+esc(playerLabel(c))+'</option>').join('')+'</select></label>').join('')+'</div>'}).join('')||'<p class="muted">Marca primero una jugadora como Líbero.</p>';
 if(current.liberoOn){const pair=current.liberoOn,c=courtPlayer(pair.centralId),l=courtPlayer(pair.liberoId);$('liberoQuick').innerHTML=c&&l?'<button class="return-libero" data-libero-return="true">↩ Vuelve '+esc(playerLabel(c))+' · Sale '+esc(l.name)+'<br>Relevo líbero · Sin cambio</button>':''}
 else $('liberoQuick').innerHTML=current.liberoLinks.map(link=>{const l=courtPlayer(link.liberoId),c=courtPlayer(link.centralId);if(!l||!c)return '';return '<button data-libero-enter="'+esc(l.pid)+'" data-central="'+esc(c.pid)+'" '+(!current.courtConfigured||!current.court.includes(c.pid)||current.court.includes(l.pid)?'disabled':'')+'>Entra '+esc(playerLabel(l))+' por '+esc(playerLabel(c))+'<br>Relevo líbero · Sin cambio</button>'}).join('');
}
function changePlayerRole(id,role){const p=courtPlayer(id);if(!p||!['normal','central','libero'].includes(role))return;
 if(current.liberoOn&&[current.liberoOn.liberoId,current.liberoOn.centralId].includes(id)){$('liberoMessage').textContent='Devuelve primero la central a pista antes de cambiar estas posiciones.';renderLibero();return}
 if(role==='libero'&&current.court.includes(id)){$('liberoMessage').textContent='Quita primero a esta jugadora de la alineación normal para designarla líbero.';renderLibero();return}
 if(role==='libero'&&current.statsPlayers.includes(id)&&current.statsPlayers.filter(x=>courtPlayer(x)?.role==='libero'&&x!==id).length>=2){$('liberoMessage').textContent='La selección ya tiene dos líberos. Quita una de la selección antes de añadir otra.';renderLibero();return}const before=statSnapshot();p.role=role;current.liberoLinks=current.liberoLinks.filter(l=>courtPlayer(l.liberoId)?.role==='libero'&&courtPlayer(l.centralId)?.role==='central');pushHistory(before);save();rows();$('liberoMessage').textContent='Posición guardada en este partido.';
}
function setLiberoLink(liberoId,slot,centralId){
 if(current.liberoOn){$('liberoMessage').textContent='Devuelve primero la central a pista para editar los vínculos.';renderLibero();return}
 if(courtPlayer(liberoId)?.role!=='libero'||![0,1].includes(slot)||centralId&&courtPlayer(centralId)?.role!=='central')return;
 const own=current.liberoLinks.filter(l=>l.liberoId===liberoId);if(centralId&&own.some((l,i)=>i!==slot&&l.centralId===centralId)){$('liberoMessage').textContent='Elige dos centrales diferentes.';renderLibero();return}
 const before=statSnapshot();const selected=[own[0]?.centralId||'',own[1]?.centralId||''];selected[slot]=centralId;current.liberoLinks=[...current.liberoLinks.filter(l=>l.liberoId!==liberoId),...selected.filter(Boolean).map(id=>({liberoId,centralId:id}))];pushHistory(before);save();rows();$('liberoMessage').textContent='Vínculo guardado. Los botones rápidos aparecen junto a los jugadores.';
}
function liberoRelay(liberoId,centralId,returning=false){
 const l=courtPlayer(liberoId),c=courtPlayer(centralId);if(!l||!c||l.role!=='libero'||c.role!=='central'||!current.courtConfigured)return;
 if(current.courtEvents.length>=1000){$('actionStatus').textContent='Se ha alcanzado el límite del historial.';return}
 if(returning){if(current.liberoOn?.liberoId!==liberoId||current.liberoOn?.centralId!==centralId||!current.court.includes(liberoId)||current.court.includes(centralId))return}
 else if(current.liberoOn||current.court.some(id=>courtPlayer(id)?.role==='libero')||!current.court.includes(centralId)||current.court.includes(liberoId)||!current.liberoLinks.some(p=>p.liberoId===liberoId&&p.centralId===centralId))return;
 if(!returning&&current.statsPlayers.length&& !current.statsPlayers.includes(liberoId)&&current.statsPlayers.filter(id=>courtPlayer(id)?.role==='libero').length>=2){$('actionStatus').textContent='Selecciona primero esta líbero en el grupo de estadísticas.';return}const before=statSnapshot(),out=returning?l:c,incoming=returning?c:l;current.court[current.court.indexOf(out.pid)]=incoming.pid;current.liberoOn=returning?null:{liberoId,centralId};courtDraft=[...statsPlayerIds()];
 current.courtEvents.push({...courtEventBase(),kind:'libero',out:courtPerson(out),in:courtPerson(incoming)});pushHistory(before);save();rows();$('actionStatus').textContent='Relevo líbero · Sale '+out.name+' → Entra '+incoming.name+' · No cuenta como cambio';
}
function initializeLibero(){
 $('playerRoles').onchange=e=>{if(e.target.dataset.playerRole)changePlayerRole(e.target.dataset.playerRole,e.target.value)};
 $('liberoLinksEditor').onchange=e=>{if(e.target.dataset.linkLibero)setLiberoLink(e.target.dataset.linkLibero,+e.target.dataset.linkSlot,e.target.value)};
 $('liberoQuick').onclick=e=>{const back=e.target.closest('button[data-libero-return]');if(back&&current.liberoOn){liberoRelay(current.liberoOn.liberoId,current.liberoOn.centralId,true);return}const b=e.target.closest('button[data-libero-enter]');if(b)liberoRelay(b.dataset.liberoEnter,b.dataset.central)};
}


function statsPlayerIds(){
 if(!current.courtConfigured)return current.players.map(p=>p.pid);
 const base=current.statsPlayers?.length?[...current.statsPlayers]:[...current.court,...current.players.filter(p=>p.role==='libero').slice(0,2).map(p=>p.pid),...(current.liberoOn?[current.liberoOn.centralId]:[])];
 return [...new Set([...base,...current.court])].filter(id=>courtPlayer(id));
}

