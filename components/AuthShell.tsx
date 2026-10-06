import Link from "next/link";
import { Brand, Mark } from "./Brand";

export function AuthShell({
  children,
  signup = false,
  admin = false,
}: {
  children: React.ReactNode;
  signup?: boolean;
  admin?: boolean;
}) {
  return (
    <main id="main" className={`auth-layout${signup ? " auth-signup" : ""}`}>
      <aside className="auth-story" aria-label="About UnsaidBox">
        <div className="auth-story-logo">
          <Brand />
        </div>
        <div className="auth-story-art" aria-hidden="true">
          <div className="auth-art-ring" />
          <div className="auth-art-ring inner" />
          <div className="auth-art-note">
            <Mark />
            <span>
              A little room
              <br />
              to be honest.
            </span>
            <div className="auth-art-lines">
              <i />
              <i />
              <i />
            </div>
          </div>
        </div>
        <div className="auth-story-copy">
          <p className="auth-eyebrow">{admin ? "UNSAIDBOX ADMINISTRATION" : "A PLACE FOR THE UNSAID"}</p>
          <h2>
            {admin ? "A trusted space." : "Honest thoughts."}
            <br />
            <span>{admin ? "Thoughtfully managed." : "On your terms."}</span>
          </h2>
          <p>
            {admin ? "Keep the community safe. Review public content and manage accounts through a dedicated, private control centre." : "Give your audience a space to speak freely. Collect privately, listen thoughtfully, and share only what you choose."}
          </p>
        </div>
        <div className="auth-story-footer">
          <span>UnsaidBox</span>
          <span>Private by default. Always your choice.</span>
        </div>
      </aside>
      <section className="auth-form-side">
        <div className="auth-form-inner">
          <div className="auth-mobile-logo">
            <Brand />
          </div>
          {children}
          <footer className="auth-form-footer">
            <Link href="/">Back to UnsaidBox</Link>
            <span aria-hidden="true">·</span>
            <Link href="/safety">Privacy & safety</Link>
          </footer>
        </div>
      </section>
    </main>
  );
}
