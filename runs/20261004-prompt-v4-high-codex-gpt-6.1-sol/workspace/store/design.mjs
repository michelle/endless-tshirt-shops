export const palettes = { sunset:['#e8bb79','#db714c','#643e57','#233f47'], tide:['#eadbb9','#71afb0','#3b717b','#183d4c'], earth:['#ecce93','#c08b50','#727457','#344942'] };
export const defaults = {place:'JOSHUA TREE',date:'2026-05-16',dedication:'THE LONG WAY HOME',scene:'desert',palette:'sunset',size:'m',color:'black'};
export function validateDesign(d) {
 const out={};
 for(const [key,max] of [['place',24],['dedication',32]]) {if(typeof d[key]!=='string'||!d[key].trim()||d[key].trim().length>max||! /^[\p{L}\p{N} .,'&!–-]+$/u.test(d[key]))throw new Error(`Please enter a valid ${key} (up to ${max} characters).`);out[key]=d[key].trim().toUpperCase();}
 if(!/^\d{4}-\d{2}-\d{2}$/.test(d.date)||!Number.isFinite(Date.parse(d.date))||new Date(d.date).toISOString().slice(0,10)!==d.date)throw new Error('Choose a valid date.');out.date=d.date;
 for(const [key,values] of Object.entries({scene:['desert','coast','mountain'],palette:Object.keys(palettes),size:['s','m','l','xl','2xl'],color:['black','white']})){if(!values.includes(d[key]))throw new Error(`Choose a valid ${key}.`);out[key]=d[key];}return out;
}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
export function artwork(d,full=false) {
 const p=palettes[d.palette]||palettes.sunset;let seed=[...d.place+d.date+d.dedication].reduce((a,c)=>((a*31+c.charCodeAt(0))>>>0),19);const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
 const sunX=330+rand()*150;const sunY=225+rand()*65;let scene='';
 if(d.scene==='mountain')scene=`<path d="M0 510L150 280L270 450L405 245L660 510V690H0Z" fill="${p[2]}"/><path d="M90 370L150 280L207 363L156 349Z M350 334L405 245L479 324L414 309Z" fill="${p[0]}"/><path d="M0 630Q170 435 340 568T660 580V690H0Z" fill="${p[3]}"/>`;
 else if(d.scene==='coast')scene=`<path d="M0 410H660V690H0Z" fill="${p[2]}"/><path d="M0 510Q150 465 330 530T660 495M0 560Q190 505 350 573T660 550M0 613Q120 565 350 625T660 603" fill="none" stroke="${p[0]}" stroke-width="7"/><path d="M0 435Q140 463 115 570T235 690H0Z" fill="${p[3]}"/><path d="M95 440L127 251L177 430Z" fill="${p[3]}"/>`;
 else scene=`<path d="M0 450Q160 370 310 470T660 410V690H0Z" fill="${p[1]}"/><path d="M0 545Q160 470 350 550T660 500V690H0Z" fill="${p[2]}"/><path d="M0 665Q270 535 660 635V690H0Z" fill="${p[3]}"/><path d="M140 614V440M140 515H109V472M140 490H176V449" fill="none" stroke="${p[3]}" stroke-width="20" stroke-linecap="round"/>`;
 let stars='';for(let i=0;i<19;i++)stars+=`<circle cx="${40+rand()*580}" cy="${155+rand()*150}" r="${1.5+rand()*2}" fill="${p[0]}" opacity=".65"/>`;
 const date=d.date.split('-');const caption=`${date[1]}.${date[2]}.${date[0]}`;const textSize=Math.min(67,1000/Math.max(d.place.length,1));
 const art=`<g><rect x="20" y="20" width="620" height="850" rx="300" fill="${p[0]}"/><path d="M20 345Q20 40 330 40T640 345V690H20Z" fill="${p[3]}"/><g clip-path="url(#land)"><circle cx="${sunX}" cy="${sunY}" r="100" fill="${p[1]}"/>${stars}${scene}</g><path d="M43 355Q43 64 330 64T617 355" fill="none" stroke="${p[0]}" stroke-width="3" opacity=".55"/><text x="330" y="133" text-anchor="middle" font-family="Arial,sans-serif" font-size="16" letter-spacing="5" fill="${p[0]}">ELSEWHERE CLUB</text><text x="330" y="754" text-anchor="middle" font-family="Arial,sans-serif" font-weight="900" font-size="${textSize}" fill="${p[3]}">${esc(d.place)}</text><text x="330" y="792" text-anchor="middle" font-family="Arial,sans-serif" font-size="17" letter-spacing="3" fill="${p[3]}">${esc(d.dedication)}</text><text x="330" y="831" text-anchor="middle" font-family="Arial,sans-serif" font-size="17" letter-spacing="4" fill="${p[3]}">${caption}</text></g>`;
 // Exact US front print canvas. Transparent margins place the graphic on the chest.
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${full?2490:660}" height="${full?3510:900}" viewBox="${full?'0 0 2490 3510':'0 0 660 900'}"><defs><clipPath id="land"><path d="M20 345Q20 40 330 40T640 345V690H20Z"/></clipPath></defs>${full?`<g transform="translate(345 260) scale(2.72727)">${art}</g>`:art}</svg>`;
}
