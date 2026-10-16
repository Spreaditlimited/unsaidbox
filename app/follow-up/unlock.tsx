'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ActionForm } from '@/components/ActionForm';
import { openFollowup } from './actions';
import type { Result } from '@/app/actions';

export function FollowupUnlock() {
  const [value, setValue] = useState('');
  const router = useRouter();
  useEffect(() => {
    // Fragment secrets are not sent in HTTP URLs. Remove before security scripts run on submit.
    const fragment = window.location.hash.slice(1);
    if (/^[a-f0-9]{64}$/.test(fragment)) setValue(fragment);
    window.history.replaceState(null, '', '/follow-up');
  }, []);
  async function open(previous: Result, form: FormData) {
    const result = await openFollowup(previous, form);
    if (result.conversationId) router.replace(`/follow-up/${result.conversationId}`);
    return result;
  }
  return <ActionForm action={open} captchaAction="openFollowup" label="Open private conversation">
    <input type="hidden" name="returnToken" value={value} />
    {!value ? <p className="notice">Open the complete return link you saved after submitting. If you have lost it, we cannot recover it or identify which message was yours.</p>
      : <p className="privacy-note">Your return link is your key. Keep it private—anyone with it can read and reply as you.</p>}
  </ActionForm>;
}
