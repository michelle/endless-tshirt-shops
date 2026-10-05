import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { shapes, type Design } from './design';
export async function printPdf(design:Design){
 const pdf=await PDFDocument.create();pdf.setTitle(`Field Notes - ${design.place}`);pdf.setCreator('Field Notes');
 const page=pdf.addPage([597.6,842.4]);const regular=await pdf.embedFont(StandardFonts.Helvetica);const bold=await pdf.embedFont(StandardFonts.HelveticaBold);const scale=597.6/600;
 const color=(hex:string)=>rgb(parseInt(hex.slice(1,3),16)/255,parseInt(hex.slice(3,5),16)/255,parseInt(hex.slice(5,7),16)/255);
 for(const s of shapes(design)){
  if(s.kind==='path')page.drawSvgPath(s.d,{x:0,y:842.4,scale,color:color(s.fill)});
  else if(s.kind==='circle')page.drawCircle({x:s.x*scale,y:842.4-s.y*scale,size:s.r*scale,color:color(s.fill)});
  else {const font=s.bold?bold:regular;const size=s.size*scale;page.drawText(s.text,{x:s.x*scale-font.widthOfTextAtSize(s.text,size)/2,y:842.4-s.y*scale,size,font,color:color(s.fill)});}
 }
 return pdf.save();
}
