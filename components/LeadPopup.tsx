'use client';
import { usePathname } from 'next/navigation';
import { useEffect,useState } from 'react';
import { Dialog } from 'radix-ui';
import { LeadSignupForm } from './LeadSignupForm';
import { leadInvitationAvailable } from '@/app/updates/actions';
import { leadPopupPath,leadStorageKey } from '@/lib/lead-policy.mjs';
import styles from './lead-popup.module.css';

function hidden(){try{return Number(localStorage.getItem(leadStorageKey))>Date.now();}catch{return false;}}
function remember(days:number){try{localStorage.setItem(leadStorageKey,String(Date.now()+days*86400000));}catch{/* In-memory dismissal still works. */}}
export function LeadPopup({enabled}:{enabled:boolean}) {
  const path=usePathname();
  const [visible,setVisible]=useState(false),[dismissed,setDismissed]=useState(false),[open,setOpen]=useState(false),[pending,setPending]=useState(false),[success,setSuccess]=useState(false);
  useEffect(()=>{
    setVisible(false);setOpen(false);
    if(!enabled||dismissed||!leadPopupPath(path)||hidden())return;
    let cancelled=false,allowed=false;const started=Date.now();
    void leadInvitationAvailable().then(value=>{if(!cancelled)allowed=value;}).catch(()=>{});
    const timer=setInterval(()=>{
      if(cancelled||!allowed||Date.now()-started<20000||document.visibilityState!=='visible'||document.querySelector('.cookie-banner,[role="dialog"],[role="alertdialog"],dialog[open]')||document.activeElement?.matches('input,textarea,select,[contenteditable="true"]'))return;
      const height=document.documentElement.scrollHeight-innerHeight;
      if(height>0&&scrollY/height<.35)return;
      if(!hidden())setVisible(true);clearInterval(timer);
    },1000);
    return()=>{cancelled=true;clearInterval(timer);};
  },[path,enabled,dismissed]);
  function close(){if(pending)return;remember(success?365:30);setDismissed(true);setVisible(false);setOpen(false);}
  if(!visible||!leadPopupPath(path))return null;
  return <Dialog.Root open={open} onOpenChange={value=>{if(pending)return;if(value)setOpen(true);else close();}}>
    <aside className={styles.popup} aria-labelledby="lead-invitation-heading" onKeyDown={event=>{if(event.key==='Escape'&&!open)close();}}>
      <button className={styles.close} type="button" aria-label="Dismiss email invitation" onClick={close}>×</button>
      <p className={styles.eyebrow}>THE UNSAIDBOX UPDATE</p>
      <h2 id="lead-invitation-heading" className={styles.headline}>Ask better.<br/><em>Hear more.</em></h2>
      <p className={styles.description}>Your Sunday blog digest: good questions to try, practical feedback tips and new ways to use your box.</p>
      <Dialog.Trigger asChild><button className={`button ${styles.invitationButton}`}>Get free email updates <span aria-hidden="true">→</span></button></Dialog.Trigger>
      <p className={styles.note}>Sundays at 6pm UK time, plus updates and occasional offers.<br/>Unsubscribe whenever you like.</p>
    </aside>
    <Dialog.Portal>
      <Dialog.Overlay className="modal-overlay"/>
      <Dialog.Content className={`app-modal ${styles.dialog}`} onEscapeKeyDown={event=>{if(pending)event.preventDefault();}} onPointerDownOutside={event=>{if(pending)event.preventDefault();}} onInteractOutside={event=>{if(pending)event.preventDefault();}}>
        <p className={styles.dialogEyebrow}>THE UNSAIDBOX UPDATE</p>
        <Dialog.Title className={`modal-title ${styles.dialogTitle}`}>A better question<br/>starts here.</Dialog.Title>
        <Dialog.Description className={`modal-description ${styles.dialogDescription}`}>A weekly blog digest on Sundays at 6pm UK time, plus practical tips, product news and occasional offers. No account needed.</Dialog.Description>
        <LeadSignupForm onPending={setPending} onSuccess={()=>{remember(365);setSuccess(true);}}/>
        <div className={styles.dialogActions}><Dialog.Close asChild><button className={styles.cancel} disabled={pending}>{success?'Continue exploring':'Not now'}</button></Dialog.Close></div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
