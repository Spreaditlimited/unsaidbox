"use client";

export function CookieSettingsButton() {
  return (
    <button type="button" className="button secondary" aria-haspopup="dialog" onClick={() => window.dispatchEvent(new Event("unsaidbox:cookie-settings"))}>
      Cookie settings
    </button>
  );
}
