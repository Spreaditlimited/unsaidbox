"use client";
import { useId, useRef, useState } from 'react';
import { Captcha, useCaptcha } from '@/components/Captcha';
import { Checkbox } from '@/components/ui/Checkbox';
import { FilePicker } from '@/components/ui/FilePicker';
import { saveBrand } from './features-actions';
import styles from './billing.module.css';
import Link from 'next/link';

export function ProTools({ brand, month }: { brand: { name: string; accent: string; hideAttribution: boolean; hasLogo: boolean } | null; month: string }) {
  const secure = useCaptcha();
  const id=useId();
  const inFlight=useRef(false);
  const [removeLogo,setRemoveLogo]=useState(false);
  const [hasLogo,setHasLogo]=useState(brand?.hasLogo??false);
  const [failed,setFailed]=useState(false);
  const [logo, setLogo] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if(inFlight.current)return; inFlight.current=true; const data = new FormData(event.currentTarget); if (logo) data.set('logo', logo);
    setBusy(true); setStatus(''); setFailed(false);
    try { await secure(data, 'saveBrand'); const result = await saveBrand(data); setStatus(result.error || result.success || ''); setFailed(Boolean(result.error)); if (result.success) {setHasLogo(logo?true:removeLogo?false:hasLogo);setLogo(null);setRemoveLogo(false);} }
    catch { setFailed(true);setStatus('Could not save branding. Please try again.'); } finally { inFlight.current=false;setBusy(false); }
  }
  return <div className={`${styles.manageGrid} ${styles.toolsGrid}`}>
    <section className={`panel ${styles.management} ${styles.brandCard}`} aria-labelledby={`${id}-title`}>
      <header className={styles.brandHeader}><span className={styles.brandEyebrow}>YOUR PRO WORKSPACE</span><h2 id={`${id}-title`}>Your share-card brand</h2><p>Make your cards feel like you. A name and logo are entirely optional.</p></header>
      <form className={`app-form ${styles.brandForm}`} onSubmit={save} aria-busy={busy}><fieldset disabled={busy}>
        <div className={styles.brandGroup}><h3>Name &amp; colour</h3><div className={styles.brandFields}>
          <label>Brand name <span className={styles.optional}>Optional</span><input name="name" maxLength={60} defaultValue={brand?.name ?? ''} placeholder="Your name or business" aria-describedby={`${id}-name-help`}/><span id={`${id}-name-help`} className={styles.fieldHelp}>Leave blank to show no custom brand name.</span></label>
          <label>Accent colour<input name="accent" maxLength={7} pattern="#[0-9a-fA-F]{6}" required defaultValue={brand?.accent || '#5850B8'} placeholder="#5850B8" aria-describedby={`${id}-colour-help`}/><span id={`${id}-colour-help`} className={styles.fieldHelp}>Use a dark hex colour for readable branding.</span></label>
        </div></div>
        <div className={styles.brandGroup}><h3>Brand logo <span className={styles.optional}>Optional</span></h3>
          <FilePicker label={hasLogo?'Replace brand logo':'Choose brand logo'} onChoose={file=>{setLogo(file);setRemoveLogo(false);}} disabled={busy} help="JPG, PNG or WebP · up to 2 MB. Cropped to a square; metadata removed." />
          {logo?<p className={styles.logoStatus}>Ready to upload: {logo.name}<button type="button" onClick={()=>setLogo(null)} disabled={busy}>Cancel selection</button></p>:hasLogo?<p className={styles.logoStatus}>Your saved logo is available for new share cards.</p>:<p className={styles.logoStatus}>No logo added. Leave this empty for cards without a logo.</p>}
          {hasLogo?<Checkbox name="removeLogo" checked={removeLogo} onChange={event=>{setRemoveLogo(event.target.checked);if(event.target.checked)setLogo(null);}}>Remove saved logo when I save</Checkbox>:null}
        </div>
        <div className={styles.brandGroup}><h3>UnsaidBox attribution</h3><Checkbox name="hideAttribution" defaultChecked={brand?.hideAttribution}>Remove the UnsaidBox name from my share cards</Checkbox><p className={styles.fieldHelp}>For a card without any brand name, leave Brand name blank and turn this on.</p></div>
        <Captcha />
      </fieldset>
      <footer className={styles.brandFooter}><button className="button" disabled={busy} type="submit">{busy?'Saving…':'Save branding'}</button><p>Applies when you next open Share Studio.</p></footer>
      {status?<p role={failed?'alert':'status'} className={failed?'form-error':styles.brandSuccess}>{status}</p>:null}
      </form>
      <p className={styles.brandNote}>These settings are separate from your private profile photo. We keep them if your plan ends; cards use UnsaidBox branding until Pro is active again.</p>
    </section>
    <section className={`panel ${styles.management}`}><h2>Your export centre</h2><p className="fine">Choose dates, collection links and columns. Download a complete CSV, or put each completed form submission on a single row. Existing privacy restrictions remain in place.</p>
      <Link className="button" href="/dashboard/exports">Open export centre →</Link>
    </section>
  </div>;
}
