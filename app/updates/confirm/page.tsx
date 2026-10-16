import { SiteShell } from '@/components/SiteShell';
import { LeadConfirmation } from '@/components/LeadConfirmation';
import { leadEnabled } from '@/lib/lead-policy.mjs';
export const dynamic='force-dynamic';
export const metadata={title:'Confirm your email updates',robots:{index:false,follow:false}};
// GET only renders a form. Confirmation requires a CAPTCHA-protected POST.
export default function ConfirmUpdates(){return <SiteShell><LeadConfirmation enabled={leadEnabled()}/></SiteShell>;}
