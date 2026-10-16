'use client';
import Link from 'next/link';
import { useEffect,useRef,useState } from 'react';
import { Captcha,useCaptcha } from './Captcha';
import { LeadSignupForm } from './LeadSignupForm';
import { confirmEmailUpdates } from '@/app/updates/actions';
import { leadStorageKey } from '@/lib/lead-policy.mjs';

export function LeadConfirmation({enabled}:{enabled:boolean}) {
  const captured=useRef(false),inFlight=useRef(false);
  const [token,setToken]=useState(''),[loaded,setLoaded]=useState(false),[pending,setPending]=useState(false),[success,setSuccess]=useState(''),[error,setError]=useState('');
  const secure=useCaptcha();
  useEffect(()=>{
    if(captured.current)return;captured.current=true;
    const value=location.hash.slice(1);
    if(/^[a-f0-9]{64}$/.test(value))setToken(value);
    history.replaceState(null,'',location.pathname);setLoaded(true);
  },[]);
  async function submit(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();if(inFlight.current)return;
    const data=new FormData(event.currentTarget);
    inFlight.current=true;setPending(true);setError('');
    try {
      await secure(data,'lead_confirm');
      const result=await confirmEmailUpdates({},data);
      if(result.error)setError(result.error);
      else if(result.success){setSuccess(result.success);setToken('');try{localStorage.setItem(leadStorageKey,String(Date.now()+365*86400000));}catch{}}
    } catch {setError('We could not connect. Please try again.');}
    finally {inFlight.current=false;setPending(false);}
  }
  return <section className="wrap section" style={{maxWidth:720,paddingBlock:'72px'}}>
    <p className="eyebrow">UNSAIDBOX EMAIL UPDATES</p>
    <h1>{success?'Your choice is confirmed.':'A useful next step, in your inbox.'}</h1>
    {success?<><p role="status">{success}</p><p>Unsubscribe through any marketing email. If you create an account with the same verified email, you can also manage this choice in Settings.</p><Link href="/templates" className="button">Find your next question →</Link></>:!enabled?<p>Email signup is not available yet. Please check back shortly.</p>:<>
      <p>Confirm your email to receive UnsaidBox tips, product updates and occasional offers. This does not create an account or sign you in.</p>
      {loaded&&token?<form className="app-form" onSubmit={submit}><input type="hidden" name="token" value={token} data-sensitive="true"/>{error?<p role="alert" className="form-error">{error}</p>:null}<Captcha/><button className="button" disabled={pending}>{pending?'Confirming…':'Confirm my subscription'}</button></form>:loaded?<p>Open the complete link from your confirmation email to continue.</p>:<p>Opening your confirmation link…</p>}
      {loaded&&(!token||error)?<div className="panel dashboard-section"><h2>Request a new link</h2><p>Allow ten minutes between confirmation requests.</p><LeadSignupForm/></div>:null}
      <p className="fine">Joining is free. Unsubscribe at any time. <Link href="/safety">Privacy &amp; safety</Link>.</p>
    </>}
  </section>;
}
