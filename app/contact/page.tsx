import Link from "next/link";
import { SiteShell } from "@/components/SiteShell";
import { ActionForm } from "@/components/ActionForm";
import { Checkbox } from "@/components/ui/Checkbox";
import { sendContact } from "./actions";
export const metadata = {
  title: "Contact us",
  description: "Questions about UnsaidBox? Get in touch with our team.",
};
export default function Contact() {
  return (
    <SiteShell>
      <section className="contact-hero">
        <div className="wrap">
          <p className="eyebrow">LET’S TALK</p>
          <h1>
            We’re here to <span className="serif accent">listen.</span>
          </h1>
          <p>
            Need a hand with your box, have an idea, or want to ask us
            something? Get in touch.
          </p>
        </div>
      </section>
      <div className="wrap contact-layout">
        <aside
          className="contact-details"
          aria-labelledby="contact-details-heading"
        >
          <h2 id="contact-details-heading">A real team. An open inbox.</h2>
          <p>Choose whichever way feels easiest.</p>
          <dl>
            <div>
              <dt>Email us</dt>
              <dd>
                <a href="mailto:hello@unsaidbox.com">hello@unsaidbox.com</a>
              </dd>
            </div>
            <div>
              <dt>Call us</dt>
              <dd>
                <a href="tel:+447881194138">+44 7881 194138</a>
              </dd>
            </div>
            <div>
              <dt>Our address</dt>
              <dd>
                <address>
                  33 Bevan Court, Dunlop Street,
                  <br />
                  Warrington, England.
                </address>
              </dd>
            </div>
          </dl>
          <div className="contact-note">
            <h3>Your privacy matters</h3>
            <p>
              This form contacts the UnsaidBox team. It is not an anonymous
              message to a box owner. Please don’t include passwords or
              sensitive personal information.
            </p>
            <Link href="/safety">Privacy & safety ↗</Link>
          </div>
        </aside>
        <section
          className="panel contact-form-panel"
          aria-labelledby="contact-form-heading"
        >
          <h2 id="contact-form-heading">Send us a message</h2>
          <p className="fine">All fields below are required.</p>
          <ActionForm
            action={sendContact}
            label="Send enquiry"
            sentScreen
            successTitle="Enquiry submitted"
            captchaAction="sendContact"
          >
            <div className="contact-field-grid">
              <label>
                Your name
                <input
                  name="name"
                  required
                  maxLength={80}
                  autoComplete="name"
                />
              </label>
              <label>
                Email address
                <input
                  name="email"
                  type="email"
                  required
                  maxLength={254}
                  autoComplete="email"
                />
              </label>
            </div>
            <label>
              Subject
              <input name="subject" required maxLength={120} />
            </label>
            <label>
              How can we help?
              <textarea
                name="message"
                required
                minLength={10}
                maxLength={5000}
                rows={7}
              />
            </label>
            <div className="honeypot" aria-hidden="true">
              <label>
                Website
                <input name="website" tabIndex={-1} autoComplete="off" />
              </label>
            </div>
            <Checkbox name="contactNotice" required>
              I understand this enquiry includes my contact details so the
              UnsaidBox team can reply.{" "}
              <Link href="/safety">Privacy information</Link>.
            </Checkbox>
          </ActionForm>
        </section>
      </div>
    </SiteShell>
  );
}
