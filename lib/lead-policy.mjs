// Browser-safe policy: no environment secrets, database clients or Node imports.
export const leadStorageKey='unsaidbox:updates-invitation';
export const leadEnabled=(env=process.env)=>env.UNSAIDBOX_EMAIL_LEADS_ENABLED==='true'&&env.UNSAIDBOX_MARKETING_ENABLED==='true';
export function leadPopupPath(path) {
  const clean=path.replace(/\/$/,'')||'/';
  return ['/', '/pricing', '/templates', '/blog'].includes(clean)||/^\/blog\/(?!media$|feed$)[a-z0-9]+(?:-[a-z0-9]+)*$/.test(clean);
}
export function validateLead(input,expectedVersion) {
  if (!input||input.consent!==true||input.version!==expectedVersion||typeof input.name!=='string'||typeof input.email!=='string') throw new Error('INVALID_LEAD');
  const name=input.name.trim(),email=input.email.trim().toLowerCase();
  if (!name||name.length>80||/[<>\x00-\x1f\x7f]/.test(name)||email.length>254||!/^[\x21-\x7e]+$/.test(email)||!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) throw new Error('INVALID_LEAD');
  return {name,email};
}
