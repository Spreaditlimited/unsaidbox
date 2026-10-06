import Link from "next/link";
import { SiteShell } from "@/components/SiteShell";
export default function NotFound() {
  return (
    <SiteShell>
      <section className="empty-state wrap">
        <p className="eyebrow">NOT FOUND</p>
        <h1>This space isn’t here.</h1>
        <p>The link may be incorrect or the page may no longer be available.</p>
        <Link className="button" href="/">
          Back to UnsaidBox
        </Link>
      </section>
    </SiteShell>
  );
}
