// Generate the complete report locally and synchronously so native sharing keeps
// the user's tap activation. No report data is sent to a conversion service.
function completeReportDocument(){
 const pdf=new jspdf.jsPDF({orientation:'landscape',unit:'mm',format:'a4',compress:true});
 const content=document.createElement('div');content.innerHTML=report();
 const margin=12,width=pdf.internal.pageSize.getWidth()-2*margin,bottom=pdf.internal.pageSize.getHeight()-15;
 let y=margin;
 const textOf=el=>{const copy=el.cloneNode(true);copy.querySelectorAll('br').forEach(br=>br.replaceWith('\n'));return copy.textContent.trim().replace(/[–−]/g,'-').replace(/→/g,' a ')};
 for(const el of content.children){
  if(el.tagName==='TABLE'){
   const rows=Array.from(el.rows).map(row=>Array.from(row.cells).map(cell=>({content:textOf(cell),colSpan:cell.colSpan||1,rowSpan:cell.rowSpan||1})));
   const head=el.rows[0]&&Array.from(el.rows[0].cells).every(c=>c.tagName==='TH')?[rows.shift()]:[];
   pdf.autoTable({startY:y,head,body:rows,theme:'grid',margin:{top:margin,right:margin,bottom:15,left:margin},styles:{fontSize:8.5,cellPadding:2,overflow:'linebreak',valign:'middle',textColor:[23,44,75]},headStyles:{fillColor:[18,60,132],fontSize:9,textColor:255},alternateRowStyles:{fillColor:[238,243,249]},rowPageBreak:'avoid'});
   y=pdf.lastAutoTable.finalY+6;continue;
  }
  const text=textOf(el);if(!text)continue;
  const heading=/^H[1-6]$/.test(el.tagName),size=el.tagName==='H1'?20:heading?13:10;
  pdf.setFont('helvetica',heading?'bold':'normal');pdf.setFontSize(size);pdf.setTextColor(23,44,75);
  const lines=pdf.splitTextToSize(text,width),lineHeight=size*.45;
  if(heading&&y+lineHeight+15>bottom){pdf.addPage();y=margin}
  for(const line of lines){if(y+lineHeight>bottom){pdf.addPage();y=margin}pdf.text(line,margin,y+lineHeight);y+=lineHeight}
  y+=heading?3:4;
 }
 const pages=pdf.getNumberOfPages();for(let n=1;n<=pages;n++){pdf.setPage(n);pdf.setFont('helvetica','normal');pdf.setFontSize(8);pdf.setTextColor(90);pdf.text('Vóley Son Ferrer · '+n+' / '+pages,margin,pdf.internal.pageSize.getHeight()-7)}
 return {data:pdf.output('arraybuffer'),name:'Son-Ferrer-'+(current.date||'partido')+'.pdf',type:'application/pdf'};
}
