import Link from "next/link";
import { SiteShell } from "@/components/SiteShell";
export const metadata = { title: "Cookie information" };
export default function Cookies() {
  return (
    <SiteShell>
      <article className="wrap cookie-page">
        <p className="eyebrow">YOUR PRIVACY</p>
        <h1>Cookies, explained.</h1>
        <p>
          We use essential storage to operate UnsaidBox and optional Google
          Analytics only when you choose to allow it. Use the Cookie settings
          button at any time to change your choice.
        </p>
        <h2>Essential storage</h2>
        <p>
          The <code>unsaidbox_session</code> cookie keeps account owners signed
          in for up to seven days. Our <code>unsaidbox_cookie_consent_v1</code>{" "}
          local-storage entry remembers your choice for up to 180 days. These
          are not advertising tools.
        </p>
        <h2>Google reCAPTCHA</h2>
        <p>
          On the live site, invisible reCAPTCHA v3 checks submitted forms to
          reduce abuse. It can process device and interaction information and
          set a security cookie named <code>_GRECAPTCHA</code>. We load it when
          you submit a protected form, independently of optional analytics. It
          is bypassed during local development. Google’s{" "}
          <a href="https://policies.google.com/privacy">Privacy Policy</a> and{" "}
          <a href="https://policies.google.com/terms">Terms of Service</a>{" "}
          apply.
        </p>
        <h2>Optional Google Analytics</h2>
        <p>
          Before you accept, we do not load Google Analytics or send it
          consent-denied tracking requests. After you accept, it can measure
          visits to selected public information and demonstration pages and set{" "}
          <code>_ga</code> and <code>_ga_…</code> cookies for up to 180 days.
          Google may process device, browser and network information to provide
          this service.
        </p>
        <p>
          We exclude the dashboard, admin, authentication, contact form,
          personal box pages and anonymous submission screens. Our page-view
          events omit query strings, fragments and referrers. We do not send
          form contents, names, email addresses, anonymous messages or user IDs
          to Analytics. Advertising personalization and Google signals are
          disabled in our tag configuration.
        </p>
        <h2>Changing your choice</h2>
        <p>
          Accept and reject options are available in the initial banner. Cookie
          settings lets you withdraw later. Withdrawal clears Analytics cookies
          accessible to this site and stops further tracking; it does not erase
          information already sent to Google. Browser settings can also remove
          stored data. If storage is blocked, we keep optional Analytics off.
        </p>
        <h2>Questions?</h2>
        <p>
          Email <a href="mailto:hello@unsaidbox.com">hello@unsaidbox.com</a> or{" "}
          <Link href="/contact">contact our team</Link>. See also our{" "}
          <Link href="/safety">privacy and safety information</Link>.
        </p>
      </article>
    </SiteShell>
  );
}
