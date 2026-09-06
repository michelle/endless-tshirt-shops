import sharp from 'sharp';
import {writeFile} from 'node:fs/promises';
const colors={orbit:'#c7efb7',phase:'#e8dcbc',pluto:'#c7d9fa'};
for(const [id,color] of Object.entries(colors)){
 let diagram='';
 if(id==='orbit')diagram=`<g fill="none" stroke="${color}" stroke-width="4"><circle cx="400" cy="360" r="160"/><ellipse cx="400" cy="360" rx="230" ry="84" transform="rotate(-30 400 360)"/><ellipse cx="400" cy="360" rx="230" ry="84" transform="rotate(30 400 360)"/><path d="M400 120v35m0 410v35M155 360h35m420 0h35"/></g><circle cx="400" cy="360" r="15" fill="${color}"/><circle cx="541" cy="284" r="12" fill="${color}"/>`;
 if(id==='phase'){diagram=`<circle cx="400" cy="350" r="170" fill="none" stroke="${color}" stroke-width="2" stroke-dasharray="4 10"/>`;for(let i=0;i<8;i++){let a=i*Math.PI/4,x=400+170*Math.cos(a),y=350+170*Math.sin(a);diagram+=`<circle cx="${x}" cy="${y}" r="36" fill="none" stroke="${color}" stroke-width="2"/>`;
if(i===4)diagram+=`<circle cx="${x}" cy="${y}" r="36" fill="${color}"/>`;
else if(i!==0){const wax=i<4,outer=wax?1:0;let inner='L'+x+' '+(y-36);if(i!==2&&i!==6){const sweep=(i===1||i===5)?0:1;inner=`A24 36 0 0 ${sweep} ${x} ${y-36}`;}diagram+=`<path d="M${x} ${y-36} A36 36 0 0 ${outer} ${x} ${y+36} ${inner} Z" fill="${color}"/>`;}}diagram+=`<text x="400" y="360" fill="${color}" text-anchor="middle" font-family="monospace" font-size="24">LUNAR CLUB</text>`;}
 if(id==='pluto')diagram=`<g stroke="${color}" fill="none"><ellipse cx="400" cy="360" rx="240" ry="110" transform="rotate(-25 400 360)" stroke-width="3"/><circle cx="400" cy="360" r="105" stroke-width="5"/><path d="M370 350q30-45 60 0q-30 65-60 0Z" stroke-width="3"/><path d="M555 210l60-50h70" stroke-width="2"/></g><circle cx="600" cy="220" r="12" fill="${color}"/><text x="595" y="140" fill="${color}" font-family="monospace" font-size="22">PLUTO</text>`;
 const title={orbit:['KEEP LOOKING','UP.'],phase:['JUST ONE MORE','PHASE.'],pluto:['STILL A PLANET','TO ME.']}[id];
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="4677" height="5881" viewBox="0 0 800 1006"><g fill="${color}" text-anchor="middle" font-family="Arial,sans-serif"><text x="400" y="85" font-size="21" letter-spacing="9">NIGHT SHIFT</text></g>${diagram}<g fill="${color}" text-anchor="middle" font-family="Arial,sans-serif" font-weight="bold"><text x="400" y="700" font-size="57" letter-spacing="1">${title[0]}</text><text x="400" y="775" font-size="75">${title[1]}</text></g><path d="M170 830h460" stroke="${color}" stroke-width="2"/><text x="400" y="877" fill="${color}" text-anchor="middle" font-family="monospace" font-size="17" letter-spacing="4">THE AFTER DARK COLLECTION</text></svg>`;
 await writeFile(`public/artwork/${id}-${id==='phase'?'v2':'v1'}.svg`,svg);
 await sharp(Buffer.from(svg)).png().withMetadata({density:300}).toFile(`public/artwork/${id}-${id==='phase'?'v2':'v1'}.png`);
 console.log('Created print artwork:',id,'4677 × 5881');
}
