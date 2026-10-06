import { SiteShell } from "@/components/SiteShell";
import { ShareStudio } from "@/components/ShareStudio";
export const metadata = { title: "Sharing studio · Demo" };
export default function ShareDemo() {
  return (
    <SiteShell>
      <section className="wrap studio-intro">
        <p className="eyebrow">FROM RESPONSE TO READY-TO-SHARE</p>
        <h1>
          The words deserve
          <br />
          <span className="serif accent">a better frame.</span>
        </h1>
        <p className="lead">
          Copy the text. Create a card. Take it wherever the conversation
          happens.
        </p>
        <div className="notice">
          Working demo · Cards and clipboard tools are real. Responses are
          samples; nothing is saved to an inbox or published automatically.
        </div>
        <a
          className="button secondary mobile-preview-jump"
          href="#share-preview"
        >
          Jump to card preview ↓
        </a>
      </section>
      <section
        className="wrap studio-section"
        aria-label="Response sharing studio"
      >
        <ShareStudio />
      </section>
    </SiteShell>
  );
}
