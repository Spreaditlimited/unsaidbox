"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Brand, Arrow } from "./Brand";

export function PublicHeader() {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <header className="site-header wrap" onKeyDown={(event) => {
      if (event.key === "Escape" && open) {
        setOpen(false);
        trigger.current?.focus();
      }
    }} onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }}>
      <Brand />
      <nav id="public-navigation" className={open ? "public-navigation is-open" : "public-navigation"} aria-label="Main navigation" onClick={() => setOpen(false)}>
        <Link href="/#how-it-works">How it works</Link>
        <Link href="/explore">Explore</Link>
        <Link href="/dashboard">My box</Link>
        <Link href="/contact">Contact</Link>
      </nav>
      <div className="public-header-actions">
        <Link className="button small" href="/start">Your own box <Arrow /></Link>
        <button ref={trigger} type="button" className="public-menu-toggle" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} aria-controls="public-navigation" onClick={() => setOpen(value => !value)}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            {open ? <path d="m6 6 12 12M6 18 18 6" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
          </svg>
        </button>
      </div>
    </header>
  );
}
