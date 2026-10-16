// One-time migration of interface CSS to semantic roles. Illustrations and exports are excluded.
import fs from 'node:fs';import path from 'node:path';import postcss from 'postcss';
const files=[];function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else if(p.endsWith('.css')&&!p.endsWith('/theme.css'))files.push(p);}}walk('app');walk('components');
const pattern=/(?<![-\w])(?:#(?:[\da-f]{8}|[\da-f]{6}|[\da-f]{4}|[\da-f]{3})\b|rgba?\([^)]*\)|\b(?:white|black)\b)/gi;
function colour(value){if(value==='white')return [255,255,255,1];if(value==='black')return [0,0,0,1];if(value.startsWith('rgb')){const n=value.match(/[\d.]+/g)?.map(Number);return n?.length>=3?[...n.slice(0,3),n[3]??1]:null;}let h=value.slice(1);if(h.length<5)h=h.split('').map(c=>c+c).join('');return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16),h.length===8?parseInt(h.slice(6),16)/255:1];}
function role(value,prop){const c=colour(value.toLowerCase());if(!c)return null;const [r,g,b]=c.map(v=>v/255),max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min,l=(max+min)/2,s=d?d/(1-Math.abs(2*l-1)):0;let h=0;if(d){h=(max===r?((g-b)/d)%6:max===g?(b-r)/d+2:(r-g)/d+4)*60;h=(h+360)%360;}
 const family=s>.12?(h<15||h>=330?'danger':h<65?'warning':h<165?'success':h<230?'info':'purple'):null;
 if(prop.includes('shadow'))return c[3]<.07?'shadow-soft':'shadow';
 if(prop.includes('outline'))return 'focus';
 if(prop.includes('border'))return family&&l<.8?family+'-border':l<.75?'border-strong':'border';
 const text=['color','fill','stroke','text-decoration-color','caret-color'].includes(prop)||prop.startsWith('--')&&/ink|muted|accent|deep/.test(prop);
 if(text){if(l>.92)return 'on-inverse';if(family&&s>.22)return family==='purple'?'accent':family+'-text';if(l<.28)return 'text';return l>.7?'text-muted':'text-secondary';}
 if(prop.startsWith('--')){if(/line/.test(prop))return 'border';if(/paper/.test(prop))return 'page';if(/white/.test(prop))return 'surface';if(/lavender|tint/.test(prop))return family?family+'-bg':'surface-tint';if(/workspace-bg/.test(prop))return 'surface-subtle';}
 if(c[3]<.75){if(l<.35&&c[3]>.25)return 'overlay';return l>.8?'surface':c[3]<.08?'surface-subtle':'surface-tint';}
 if(l<.35){if(family==='purple'&&s>.3)return 'accent-solid';return 'inverse';}
 if(l<.66&&s>.3)return family==='purple'?'accent-solid':family?family+'-solid':'inverse';
 if(l>.98)return 'surface';
 if(family&&s>.12&&l>.65)return family+'-bg';return l>.85?'surface-subtle':'border-strong';
}
const report=[];
for(const file of files){const ast=postcss.parse(fs.readFileSync(file,'utf8'));ast.walkDecls(d=>{
 const selector=d.parent.selector??'';
 if(d.value.includes('url(')||d.prop==='filter'||file.endsWith('GoogleSignIn.module.css')||/auth-story|auth-art|auth-eyebrow/.test(selector)||/\.swatch(?:\.|\b)|\.cardPreview|\.cardBrand|\.cardFoot/.test(selector))return;
 const before=d.value;
 if(/background/.test(d.prop))d.value=d.value.replace(/var\(--indigo\)/g,'var(--color-accent-solid)').replace(/var\(--ink\)/g,'var(--color-inverse)');
 if(/border/.test(d.prop)&&/button|check.*checked/.test(selector))d.value=d.value.replace(/var\(--indigo\)/g,'var(--color-accent-solid)');
 d.value=d.value.replace(pattern,v=>{const mapped=role(v,d.prop);return mapped?`var(--color-${mapped})`:v;});
 if(d.value!==before)report.push({file,selector,property:d.prop,before,after:d.value});
 });fs.writeFileSync(file,ast.toString());}
fs.writeFileSync('docs/appearance/colour-migration.json',JSON.stringify(report,null,2)+'\n');console.log(`Converted ${report.length} interface declarations across ${files.length} stylesheets.`);
