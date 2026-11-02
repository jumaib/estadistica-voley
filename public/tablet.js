let tabletPreference='auto';try{tabletPreference=localStorage.getItem('sonferrer-tablet-view')||'auto'}catch{}
function updateTabletLayout(){
 const phone=window.matchMedia('(max-width:600px), (max-width:900px) and (max-height:500px)').matches;
 const auto=window.matchMedia('(min-width:601px) and (max-width:1100px) and (min-height:501px), (pointer:coarse) and (min-width:601px) and (max-width:1440px) and (min-height:501px)').matches;
 const enabled=!phone&&(tabletPreference==='tablet'||tabletPreference==='auto'&&auto);
 $('matchPanel').dataset.tabletLayout=String(enabled);$('tabletView').setAttribute('aria-pressed',String(enabled));$('tabletView').textContent=enabled?'Vista normal':'Vista tablet';
}
$('tabletView').onclick=()=>{tabletPreference=$('matchPanel').dataset.tabletLayout==='true'?'normal':'tablet';try{localStorage.setItem('sonferrer-tablet-view',tabletPreference)}catch{}updateTabletLayout();syncMobileStep()};
window.addEventListener('resize',updateTabletLayout);updateTabletLayout();
