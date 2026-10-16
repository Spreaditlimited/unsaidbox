import Link from "next/link";
import { Brand } from "./Brand";
import { PublicHeader } from "./PublicHeader";
import { LeadPopup } from './LeadPopup';
import { leadEnabled } from '@/lib/lead-policy.mjs';

export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PublicHeader />
      <main id="main">{children}</main>
      <footer className="site-footer wrap">
        <div>
          <Brand />
          <p>A place for the unsaid.</p>
        </div>
        <nav aria-label="Footer navigation">
          <Link href="/pricing">Pricing</Link>
          <Link href="/safety">Privacy & safety</Link>
          <Link href="/terms">Terms of service</Link>
          <Link href="/contact">Contact us</Link>
          <Link href="/cookies">Cookies</Link>
          <Link href="/start">Create your box</Link>
          <Link href="/explore">Explore threads</Link>
          <Link href="/blog">Blog</Link>
          <Link href="/templates">Form templates</Link>
        </nav>
        <p className="fine">
          Thoughtful words. Shared with intention.
          <br />
          © 2026 UnsaidBox
        </p>
      </footer>
      <LeadPopup enabled={leadEnabled()}/>
    </>
  );
}
