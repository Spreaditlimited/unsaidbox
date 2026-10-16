'use client';
import {createContext,useContext,useEffect,useState} from 'react';
import {THEME_STORAGE_KEY,validTheme} from '@/lib/theme-init.mjs';
export type ThemePreference='light'|'dark'|'system';
function paint(preference:ThemePreference){
 const root=document.documentElement;
 root.dataset.themeChanging='true';root.dataset.themePreference=preference;
 const dark=preference==='dark'||preference==='system'&&matchMedia('(prefers-color-scheme: dark)').matches;
 root.dataset.theme=dark?'dark':'light';
 document.querySelector('meta[name="theme-color"]')?.setAttribute('content',dark?'#171722':'#faf9f6');
 requestAnimationFrame(()=>requestAnimationFrame(()=>{delete root.dataset.themeChanging;}));
}
const Context=createContext<{preference:ThemePreference;choose:(value:ThemePreference)=>void;notice:string}>({preference:'light',choose:()=>{},notice:''});
export const useTheme=()=>useContext(Context);
export function ThemeProvider({children}:{children:React.ReactNode}){
 const [preference,setPreference]=useState<ThemePreference>('light'),[notice,setNotice]=useState('');
 useEffect(()=>{
  const media=matchMedia('(prefers-color-scheme: dark)');
  const apply=(value:ThemePreference)=>{paint(value);setPreference(value);};
  const initial=document.documentElement.dataset.themePreference;apply(validTheme(initial)?initial as ThemePreference:'light');
  const systemChange=()=>{if(document.documentElement.dataset.themePreference==='system')apply('system');};
  const storageChange=(event:StorageEvent)=>{if(event.key===THEME_STORAGE_KEY||event.key===null){apply(validTheme(event.newValue)?event.newValue as ThemePreference:'light');setNotice('');}};
  media.addEventListener('change',systemChange);window.addEventListener('storage',storageChange);
  return()=>{media.removeEventListener('change',systemChange);window.removeEventListener('storage',storageChange);};
 },[]);
 const choose=(value:ThemePreference)=>{
  if(!validTheme(value))return;
  paint(value);setPreference(value);setNotice('');
  try{localStorage.setItem(THEME_STORAGE_KEY,value);}catch{setNotice('Your appearance choice applies to this visit. This browser could not save it.');}
 };
 return <Context.Provider value={{preference,choose,notice}}>{children}</Context.Provider>;
}
