import { PDFDocument, StandardFonts, rgb, setCharacterSpacing, pushGraphicsState, popGraphicsState } from 'pdf-lib';
import { art, type Design } from './design';
// Transparent vector PDF: matches the 4677 x 5881 pixel front area at 300 dpi.
export async function printPdf(d: Design) {
  const pdf=await PDFDocument.create();
  pdf.setTitle(`${d.place} - ELSEWHERE print master`); pdf.setCreator('ELSEWHERE / artwork v1');
  const w=4677/300*72,h=5881/300*72,s=w/800;
  const page=pdf.addPage([w,h]);
  const regular=await pdf.embedFont(StandardFonts.Helvetica), bold=await pdf.embedFont(StandardFonts.HelveticaBold);
  const {paths,texts}=art(d);
  for(const p of paths) {
    const c=p.color.slice(1), color=rgb(parseInt(c.slice(0,2),16)/255,parseInt(c.slice(2,4),16)/255,parseInt(c.slice(4,6),16)/255);
    const path=p.points.map(([x,y],i)=>`${i?'L':'M'} ${x*s} ${y*s}`).join(' ')+' Z';
    page.drawSvgPath(path,{x:0,y:h,borderColor:color,borderWidth:p.width*s});
  }
  for(const t of texts) {
    const font=t.bold?bold:regular,size=t.size*s,spacing=t.spacing*s;
    const width=font.widthOfTextAtSize(t.text,size)+Math.max(0,t.text.length-1)*spacing;
    page.pushOperators(pushGraphicsState(),setCharacterSpacing(spacing));
    page.drawText(t.text,{font,size,x:t.x*s-width/2,y:h-t.y*s,color:rgb(244/255,241/255,233/255)});
    page.pushOperators(popGraphicsState());
  }
  return pdf.save();
}
