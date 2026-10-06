"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="empty-state wrap">
      <h1>We couldn’t load this page.</h1>
      <p>Please try again. Nothing has been submitted.</p>
      <button className="button" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
