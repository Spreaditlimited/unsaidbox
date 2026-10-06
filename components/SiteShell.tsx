import Link from "next/link";
import { Brand, Arrow } from "./Brand";

export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="preview-bar">
        UnsaidBox testing release <span>·</span> Use test content. Demo pages
        remain illustrative.
      </div>
      <header className="site-header wrap">
        <Brand />
        <nav aria-label="Main navigation">
          <Link href="/#how-it-works">How it works</Link>
          <Link href="/explore">Explore</Link>
          <Link href="/demo/share">Sharing studio</Link>
          <Link href="/dashboard">My box</Link>
          <Link href="/contact">Contact</Link>
        </nav>
        <Link className="button small" href="/start">
          Your own box <Arrow />
        </Link>
      </header>
      <main id="main">{children}</main>
      <footer className="site-footer wrap">
        <div>
          <Brand />
          <p>A place for the unsaid.</p>
        </div>
        <nav aria-label="Footer navigation">
          <Link href="/safety">Privacy & safety</Link>
          <Link href="/contact">Contact us</Link>
          <Link href="/cookies">Cookies</Link>
          <Link href="/demo">Try the demo</Link>
          <Link href="/explore">Explore threads</Link>
        </nav>
        <p className="fine">
          Thoughtful words. Shared with intention.
          <br />
          Product preview · 2026
        </p>
      </footer>
    </>
  );
}
