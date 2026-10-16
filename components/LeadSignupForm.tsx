'use client';
import Link from 'next/link';
import { useRef,useState } from 'react';
import { Checkbox } from './ui/Checkbox';
import { Captcha,useCaptcha } from './Captcha';
import { joinEmailUpdates } from '@/app/updates/actions';
import { consentStatement,consentVersion } from '@/lib/marketing-consent.mjs';
import styles from './lead-popup.module.css';

export function LeadSignupForm({onSuccess,onPending}:{onSuccess?:(message:string)=>void;onPending?:(pending:boolean)=>void}) {
  const secure=useCaptcha();
  const inFlight=useRef(false);
  const [pending,setPending]=useState(false),[error,setError]=useState(''),[success,setSuccess]=useState('');
  async function submit(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();if(inFlight.current)return;
    const data=new FormData(event.currentTarget);
    inFlight.current=true;setPending(true);onPending?.(true);setError('');
    try {
      await secure(data,'lead_subscribe');
      const result=await joinEmailUpdates({},data);
      if(result.error)setError(result.error);
      else if(result.success){setSuccess(result.success);onSuccess?.(result.success);}
    } catch {setError('We could not connect. Please try again shortly.');}
    finally {inFlight.current=false;setPending(false);onPending?.(false);}
  }
  if(success)return <div role="status" className={styles.success}><span className={styles.successMark} aria-hidden="true">✓</span><h3>Check your inbox</h3><p>{success}</p><p className="fine">Your confirmation link lasts 24 hours.</p></div>;
  return <form className={`app-form ${styles.form}`} onSubmit={submit}>
    <fieldset disabled={pending}>
      <input name="version" type="hidden" value={consentVersion}/>
      <div hidden aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off"/></label></div>
      <label>First name<input name="name" autoComplete="given-name" required maxLength={80}/></label>
      <label>Email address<input name="email" type="email" autoComplete="email" required maxLength={254}/></label>
      <Checkbox name="consent" required>{consentStatement}</Checkbox>
    </fieldset>
    {error?<p className="form-error" role="alert">{error}</p>:null}
    <button className={`button ${styles.submit}`} disabled={pending} type="submit">{pending?'Requesting confirmation…':'Send my confirmation link'}</button>
    <p className={styles.formNote}>Confirm your email to join. <Link href="/safety">Privacy &amp; safety</Link>.</p>
    <Captcha/>
  </form>;
}
