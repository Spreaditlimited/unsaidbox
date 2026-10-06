"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { demoQuestion } from "@/lib/demo";

export function DemoComposer({ kind }: { kind: "message" | "answer" }) {
  const [body, setBody] = useState("");
  const [complete, setComplete] = useState(false);
  const confirmation = useRef<HTMLHeadingElement>(null);
  return (
    <main id="main" className="sender-shell">
      <div className="sender-demo-label">
        INTERACTIVE PREVIEW · NOTHING IS SENT
      </div>
      <section className="sender-card">
        {complete ? (
          <>
            <span className="success-symbol" aria-hidden="true">
              ✓
            </span>
            <h1 ref={confirmation} tabIndex={-1}>
              That’s how simple it feels.
            </h1>
            <p>
              You’ve reached the demo confirmation. Your text was not sent or
              saved to a server.
            </p>
            <div className="stack">
              <button
                className="button"
                onClick={() => {
                  setComplete(false);
                  setBody("");
                }}
              >
                Try another {kind}
              </button>
              <Link className="button secondary" href="/demo/share">
                Explore sharing tools ↗
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className="sender-person">
              <span className="avatar small-avatar" aria-hidden="true">
                a.
              </span>
              <span>
                Alex’s example box
                <span className="fine">No sender account needed</span>
              </span>
            </div>
            <h1>{kind === "answer" ? demoQuestion : "What’s on your mind?"}</h1>
            <p>
              {kind === "answer"
                ? "A thought, a lesson, or a story. There’s no perfect answer."
                : "Ask a question or leave a thoughtful message."}
            </p>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (!body.trim()) return;
                setComplete(true);
                requestAnimationFrame(() => confirmation.current?.focus());
              }}
            >
              <label htmlFor="message">Your {kind}</label>
              <textarea
                id="message"
                name="message"
                value={body}
                onChange={(event) => setBody(event.target.value)}
                rows={7}
                maxLength={5000}
                required
                placeholder="A little honesty starts here…"
                aria-describedby="sender-privacy sender-count"
              />
              <div className="input-meta">
                <span>Be kind. Leave out identifying details.</span>
                <span id="sender-count">
                  {body.length.toLocaleString()} / 5,000
                </span>
              </div>
              <p id="sender-privacy" className="privacy-note">
                In the live product, your identity won’t be shown to the
                recipient. They may choose to share your words publicly. This
                demo sends nothing.
              </p>
              <button
                className="button full"
                disabled={!body.trim()}
                type="submit"
              >
                Preview submission <span aria-hidden="true">↗</span>
              </button>
            </form>
          </>
        )}
      </section>
      <div className="sender-bottom">
        <Link href="/demo">← Back to example page</Link>
        <Link href="/safety">Privacy & safety</Link>
      </div>
    </main>
  );
}
