import Link from "next/link";
import { SiteShell } from "@/components/SiteShell";
import { Arrow } from "@/components/Brand";

export const metadata = {
  robots: { index: true, follow: true },
  alternates: { canonical: "https://unsaidbox.com" },
};

export default function Home() {
  return (
    <SiteShell>
      <section className="hero wrap">
        <div className="hero-copy">
          <p className="eyebrow">
            <span className="dot" /> A LITTLE SPACE FOR HONESTY
          </p>
          <h1>
            Some things are
            <br />
            easier <span className="serif accent">unsaid.</span>
            <br />
            Until now.
          </h1>
          <p className="lead">
            Give your audience a place to ask, share, and open up. Keep their
            messages private. Share the ones that matter.
          </p>
          <div className="actions">
            <Link href="/start" className="button">
              Create your box <Arrow />
            </Link>
            <Link href="/explore" className="button secondary">
              Explore threads
            </Link>
          </div>
          <p className="fine">Your own link. A private inbox. Sharing on your terms.</p>
        </div>
        <div
          className="hero-scene"
          aria-label="Illustration of sample anonymous messages"
        >
          <span className="scene-orbit" aria-hidden="true" />
          <span className="scene-caption">
            A question. A little courage. A real connection.
          </span>
          <div className="note note-back">
            <span className="note-label">A QUESTION WORTH ASKING</span>
            <p>What would you tell your younger self?</p>
            <span className="note-line" />
          </div>
          <div className="note note-front">
            <div className="note-top">
              <span className="mini-mark">u.</span>
              <span>Someone had something to say</span>
              <span aria-hidden="true">↗</span>
            </div>
            <span className="quote-mark" aria-hidden="true">
              “
            </span>
            <p>
              You don’t have to have it all figured out to take the first step.
            </p>
            <div className="note-bottom">
              <span>Anonymous response</span>
              <span>Sample content</span>
            </div>
          </div>
          <div className="scene-tag">
            <span aria-hidden="true">✧</span> Their words. Your choice to share.
          </div>
        </div>
      </section>
      <div className="principles wrap">
        <span>One simple link</span>
        <span>Anonymous to the recipient</span>
        <span>Public only by choice</span>
      </div>
      <section className="section wrap" id="how-it-works">
        <div className="section-heading">
          <div>
            <p className="eyebrow">SMALL STEPS. MEANINGFUL CONNECTIONS.</p>
            <h2>
              Less friction.
              <br />
              <span className="serif">More honesty.</span>
            </h2>
          </div>
          <p>
            You already have an audience.
            <br />
            Give them a more comfortable way to reach you.
          </p>
        </div>
        <div className="three-grid">
          {[
            [
              "01",
              "Make a little space.",
              "Create your personal box, or ask your audience a specific question. Each gets its own simple link.",
            ],
            [
              "02",
              "Let the words come in.",
              "Share the link wherever your audience is. They write without creating an account. You review privately.",
            ],
            [
              "03",
              "Share with intention.",
              "Copy a response, turn it into a beautiful card, or choose to publish it on your page. You’re in control.",
            ],
          ].map(([number, title, description]) => (
            <article className="step-card" key={number}>
              <span className="step-number">{number}</span>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="sharing-section">
        <div className="wrap sharing-feature">
          <div className="share-illustration">
            <span className="eyebrow">FROM YOUR INBOX TO YOUR AUDIENCE</span>
            <div className="sample-share">
              <span>THE UNSAID / 001</span>
              <p>“Start before you feel ready. Confidence comes from doing.”</p>
              <div>
                Anonymous words <span>UnsaidBox ↗</span>
              </div>
            </div>
            <div className="format-labels">
              <span>Square</span>
              <span>Portrait</span>
              <span>Story</span>
            </div>
          </div>
          <div>
            <p className="eyebrow">GOODBYE, AWKWARD SCREENSHOTS.</p>
            <h2>
              Words worth sharing.
              <br />
              <span className="serif">Already beautifully framed.</span>
            </h2>
            <p className="lead">
              Choose a response. Pick a format. Download a ready-to-share card,
              or copy the words straight into a comment.
            </p>
            <p>
              Long story? We split it into readable cards. No cropping, tiny
              text, or private dashboard details accidentally left in the frame.
            </p>
            <Link href="/dashboard" className="button">
              Share from your inbox <Arrow />
            </Link>
          </div>
        </div>
      </section>
      <section className="section wrap">
        <div className="section-heading">
          <div>
            <p className="eyebrow">YOUR BOX. YOUR BOUNDARIES.</p>
            <h2>
              A public page.
              <br />
              <span className="serif">Only if you want one.</span>
            </h2>
          </div>
          <p>
            Collect quietly, or build a thoughtful collection. You never have to
            do both.
          </p>
        </div>
        <div className="two-grid">
          <article className="option-card">
            <span className="card-symbol" aria-hidden="true">
              ↙
            </span>
            <h3>Just for your inbox</h3>
            <p>
              A focused form for messages or answers. Collect privately and
              share selected responses on your existing socials.
            </p>
            <Link className="text-link" href="/start">
              Start collecting messages <Arrow />
            </Link>
          </article>
          <article className="option-card lavender">
            <span className="card-symbol" aria-hidden="true">
              ↗
            </span>
            <h3>A page of your own</h3>
            <p>
              Your introduction, your questions, and only the responses you’ve
              chosen to publish. Not an unfiltered comment section.
            </p>
            <Link className="text-link" href="/start">
              Create your own page <Arrow />
            </Link>
          </article>
        </div>
      </section>
      <section className="closing wrap">
        <p className="eyebrow">LET’S MAKE ROOM FOR THE UNSAID.</p>
        <h2>
          A little less hesitation.
          <br />
          <span className="serif">A little more connection.</span>
        </h2>
        <Link className="button" href="/start">
          Find your own space <Arrow />
        </Link>
      </section>
    </SiteShell>
  );
}
