// Fixed script shared with the provider; never interpolate user input.
export const THEME_STORAGE_KEY='unsaidbox:appearance:v1';
export const validTheme=value=>value==='light'||value==='dark'||value==='system';
export const themeInitScript=`(()=>{let preference='light';try{const saved=localStorage.getItem('${THEME_STORAGE_KEY}');if(['light','dark','system'].includes(saved))preference=saved;}catch{}const dark=preference==='dark'||preference==='system'&&matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.dataset.theme=dark?'dark':'light';document.documentElement.dataset.themePreference=preference;})();`;
