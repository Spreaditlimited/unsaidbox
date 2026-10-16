"use client";

import Link from "next/link";

export default function BillingError({ reset }: { reset: () => void }) {
  return <main id="main" className="empty-state wrap">
    <p className="eyebrow">PLAN & BILLING</p>
    <h1>Billing is temporarily unavailable.</h1>
    <p>We couldn’t verify your account or load your billing details. Please try again when the connection is restored.</p>
    <p>If you just completed checkout, don’t start another payment. Your status will be checked with Stripe when billing is available.</p>
    <div className="action-row">
      <button type="button" className="button" onClick={reset}>Try loading billing again</button>
      <Link className="button secondary" href="/dashboard">Back to dashboard</Link>
    </div>
  </main>;
}
