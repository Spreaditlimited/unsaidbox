import {readFile} from 'node:fs/promises';import postcss from 'postcss';
export const css=await readFile('app/theme.css','utf8');
const ast=postcss.parse(css);
export function palette(dark=false){const values={};ast.walkRules(r=>{if(r.parent.type!=='root')return;if(r.selector===':root'||dark&&r.selector===":root[data-theme='dark']")r.walkDecls(d=>values[d.prop]=d.value);});return values;}
const lum=hex=>{if(hex.length===4)hex='#'+hex.slice(1).split('').map(c=>c+c).join('');const c=hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722;};
export function contrast(a,b){return (Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);}
