'use client';
import {Picker} from './ui/Picker';
import {useTheme,type ThemePreference} from './ThemeProvider';
const paths={light:'M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0',dark:'M20.5 13A8.5 8.5 0 0 1 11 3.5 8.5 8.5 0 1 0 20.5 13Z',system:'M3 4h18v13H3zM8 21h8m-4-4v4'};
const options=Object.entries(paths).map(([value,path])=>({value,label:value[0].toUpperCase()+value.slice(1),icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={path}/></svg>}));
export function ThemePicker(){
 const {preference,choose,notice}=useTheme();
 return <div className="appearance-picker"><Picker name="appearance" label="Choose appearance" iconOnly hint="System follows your device." defaultValue="light" value={preference} onValueChange={value=>choose(value as ThemePreference)} options={options}/><span className="sr-only" role="status">{notice}</span></div>;
}
