'use client';
import {useEffect, useTransition} from 'react';
import {useRouter} from 'next/navigation';

export function ExportProgress({pending}:{pending:boolean}) {
  const router=useRouter();
  const [refreshing,startTransition]=useTransition();
  useEffect(()=>{
    if(!pending)return;
    const timer=window.setInterval(()=>{
      if(document.visibilityState==='visible')startTransition(()=>router.refresh());
    },10000);
    return ()=>window.clearInterval(timer);
  },[pending,router]);
  return <div><p className="fine" role="status">{pending?'Preparation is running. This history updates every 10 seconds while this tab is visible.':'Your latest export history.'}</p><button className="button secondary" type="button" disabled={refreshing} onClick={()=>startTransition(()=>router.refresh())}>{refreshing?'Refreshing…':'Refresh history'}</button></div>;
}
