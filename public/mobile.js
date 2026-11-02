// Phone-only presentation. The same controls, statistics and save handlers are
// reused, so switching steps never creates another action or changes a score.
function setMobileStep(step){
 const panel=$('matchPanel');panel.dataset.mobileStep=step;
 for(const name of ['stats','players','changes'])$('mobile-'+name).setAttribute('aria-pressed',String(name===step));
 const selected=actionDefs.find(d=>d[0]===selectedAction);
 $('mobileAction').textContent=selected?selected[1]+(selectedReason?' · '+(selectedReason==='Net'?'Red':'Fuera'):'')+' · Elige la jugadora':'Elige primero una estadística';
 if(step==='changes'){$('courtManager').open=true;courtDraft=[...statsPlayerIds()];courtDraftFor=current.id;renderCourt()}
}
function syncMobileStep(){const needsReason=['se','ae'].includes(selectedAction);setMobileStep(selectedAction&&(!needsReason||selectedReason)?'players':'stats')}
for(const name of ['stats','players','changes'])$('mobile-'+name).onclick=()=>setMobileStep(name);
for(const id of ['actionPicker','errorPicker','quickPlayers','undo','homePoint','awayPoint','removeHomePoint','removeAwayPoint'])$(id).addEventListener('click',syncMobileStep);
$('focusMatch').addEventListener('click',syncMobileStep);
$('saveCourt').addEventListener('click',()=>setMobileStep('stats'));
$('makeSub').addEventListener('click',()=>setMobileStep('stats'));
setMobileStep('stats');
