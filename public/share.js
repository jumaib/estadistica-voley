function completeReportDocument(){return {
 data:'\ufeff<html><meta charset="utf-8"><style>body{font-family:Arial}table{border-collapse:collapse}td,th{border:1px solid #bbb;padding:5px;font-size:10px}h1{color:#123c84}</style><body>'+report()+'</body></html>',
 name:'Son-Ferrer-'+(current.date||'partido')+'.doc'
}}
function shareFeedback(message){$('shareMessage').textContent=message;if(!$('shareDialog').open)$('shareDialog').showModal()}
function downloadCompleteReport(){const doc=completeReportDocument();download(doc.data,'application/msword',doc.name);shareFeedback('Informe completo descargado. Puedes adjuntarlo en WhatsApp como documento.')}
async function shareWordReport(){
 const doc=completeReportDocument();
 try{
  const file=new File([doc.data],doc.name,{type:'application/msword'});
  if(navigator.share&&navigator.canShare&&navigator.canShare({files:[file]})){
   await navigator.share({files:[file],title:'Informe completo · Vóley Son Ferrer'});
   return;
  }
 }catch(error){if(error.name==='AbortError'){shareFeedback('Has cancelado el menú para compartir. Puedes volver a intentarlo cuando quieras.');return}}
 download(doc.data,'application/msword',doc.name);
 shareFeedback('Este navegador no permite compartir archivos directamente. Ya se ha descargado el informe completo: abre WhatsApp y adjúntalo como documento.');
}
// Prepare the complete file directly from the click, preserving share activation.
$('whatsapp').onclick=()=>void shareWordReport();
$('shareWord').onclick=()=>void shareWordReport();
$('downloadShare').onclick=downloadCompleteReport;
$('closeShare').onclick=()=>$('shareDialog').close();
