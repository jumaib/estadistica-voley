function shareFeedback(message){$('shareMessage').textContent=message;if(!$('shareDialog').open)$('shareDialog').showModal()}
function downloadCompleteReport(){const doc=completeReportDocument();download(doc.data,'application/pdf',doc.name);shareFeedback('Informe PDF completo descargado. Puedes adjuntarlo en WhatsApp como documento.')}
async function sharePDFReport(){
 const doc=completeReportDocument();
 try{
  const file=new File([doc.data],doc.name,{type:'application/pdf'});
  if(navigator.share&&navigator.canShare&&navigator.canShare({files:[file]})){
   await navigator.share({files:[file],title:'Informe completo · Vóley Son Ferrer'});
   return;
  }
 }catch(error){if(error.name==='AbortError'){shareFeedback('Has cancelado el menú para compartir. Puedes volver a intentarlo cuando quieras.');return}}
 download(doc.data,'application/pdf',doc.name);
 shareFeedback('Este navegador no permite compartir archivos directamente. Ya se ha descargado el informe completo: abre WhatsApp y adjúntalo como documento.');
}
// Prepare the complete file directly from the click, preserving share activation.
$('whatsapp').onclick=()=>void sharePDFReport();
$('shareWord').onclick=()=>void sharePDFReport();
$('downloadShare').onclick=downloadCompleteReport;
$('closeShare').onclick=()=>$('shareDialog').close();
