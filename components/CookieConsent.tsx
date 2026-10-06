"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Dialog } from "radix-ui";
import { Checkbox } from "./ui/Checkbox";
import {
  analyticsPage,
  consentKey,
  consentLifetime,
  parseConsent,
} from "@/lib/analytics-policy.mjs";

type Choice = { version: number; analytics: boolean; expiresAt: number };
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    [key: `ga-disable-${string}`]: boolean | undefined;
  }
}
function clearAnalyticsCookies() {
  const names = document.cookie
    .split(";")
    .map((item) => item.split("=")[0].trim())
    .filter((name) => /^_ga(?:_|$)/.test(name));
  const parts = location.hostname.split(".");
  const domains = [
    "",
    location.hostname,
    ...parts.map((_, i) => `.${parts.slice(i).join(".")}`),
  ];
  for (const name of names)
    for (const domain of domains)
      document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax${domain ? `; Domain=${domain}` : ""}`;
}
export function CookieConsent({ id }: { id: string }) {
  const path = usePathname();
  const [loaded, setLoaded] = useState(false);
  const [choice, setChoice] = useState<Choice | null>(null);
  const [open, setOpen] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [storageError, setStorageError] = useState("");
  const scriptStarted = useRef(false);
  const lastPage = useRef("");
  const settingsButton = useRef<HTMLButtonElement>(null);

  function stopTracking(reload: boolean) {
    if (id) window[`ga-disable-${id}`] = true;
    clearAnalyticsCookies();
    document.querySelector("[data-unsaidbox-analytics]")?.remove();
    if (reload && scriptStarted.current) window.location.reload();
  }
  useEffect(() => {
    function refresh() {
      let next: Choice | null = null;
      try {
        next = parseConsent(localStorage.getItem(consentKey));
      } catch {}
      setChoice(next);
      setLoaded(true);
      if (!next?.analytics) stopTracking(true);
    }
    refresh();
    const storage = (event: StorageEvent) => {
      if (event.key === consentKey || event.key === null) refresh();
    };
    window.addEventListener("storage", storage);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("storage", storage);
      window.removeEventListener("focus", refresh);
    };
  }, [id]);

  useEffect(() => {
    if (!choice) return;
    let timer: ReturnType<typeof setTimeout>;
    function scheduleExpiry() {
      timer = setTimeout(
        () => {
          if (choice!.expiresAt > Date.now()) scheduleExpiry();
          else {
            setChoice(null);
            stopTracking(true);
          }
        },
        Math.min(2147483647, Math.max(0, choice!.expiresAt - Date.now())),
      );
    }
    scheduleExpiry();
    return () => clearTimeout(timer);
  }, [choice]);

  useEffect(() => {
    const title = analyticsPage(path);
    if (!loaded || !choice?.analytics || !id || !title) {
      if (id) window[`ga-disable-${id}`] = true;
      // A full reload removes already-executed third-party code on sensitive routes.
      if (scriptStarted.current && !title) window.location.reload();
      return;
    }
    window[`ga-disable-${id}`] = false;
    if (!scriptStarted.current) {
      window.dataLayer = [];
      window.gtag = function () {
        window.dataLayer!.push(arguments);
      };
      window.gtag("consent", "default", {
        analytics_storage: "denied",
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
      });
      window.gtag("consent", "update", { analytics_storage: "granted" });
      window.gtag("js", new Date());
      window.gtag("config", id, {
        send_page_view: false,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
        page_location: location.origin + path,
        page_referrer: "",
        page_title: title,
        cookie_expires: consentLifetime / 1000,
        cookie_update: false,
      });
      const script = document.createElement("script");
      script.dataset.unsaidboxAnalytics = "true";
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
      document.head.appendChild(script);
      scriptStarted.current = true;
    }
    if (lastPage.current !== path) {
      window.gtag?.("event", "page_view", {
        page_location: location.origin + path,
        page_referrer: "",
        page_title: title,
      });
      lastPage.current = path;
    }
    return () => {
      window[`ga-disable-${id}`] = true;
    };
  }, [choice, id, loaded, path]);

  useEffect(() => {
    const leave = (event: MouseEvent) => {
      if (
        !scriptStarted.current ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const anchor = (event.target as Element)?.closest("a");
      if (!anchor || anchor.target === "_blank") return;
      const next = new URL(anchor.href, location.href);
      if (next.origin === location.origin && !analyticsPage(next.pathname)) {
        window[`ga-disable-${id}`] = true;
        event.preventDefault();
        event.stopPropagation();
        window.location.assign(next.href);
      }
    };
    document.addEventListener("click", leave, true);
    return () => document.removeEventListener("click", leave, true);
  }, [id]);

  function save(accepted: boolean) {
    const next = {
      version: 1,
      analytics: accepted,
      expiresAt: Date.now() + consentLifetime,
    };
    try {
      localStorage.setItem(consentKey, JSON.stringify(next));
      setStorageError("");
    } catch {
      setStorageError(
        "Your browser could not save the preference. Optional analytics will remain off.",
      );
      stopTracking(true);
      setChoice({ ...next, analytics: false });
      return;
    }
    setChoice(next);
    setOpen(false);
    if (!accepted) stopTracking(true);
  }
  return (
    <>
      {loaded && !choice ? (
        <section className="cookie-banner" aria-label="Cookie choices">
          <div>
            <h2>Your privacy, your choice.</h2>
            <p>
              Essential storage keeps your box secure. With your permission,
              Google Analytics helps us understand visits to our public
              information pages. <Link href="/cookies">Cookie details</Link>.
            </p>
          </div>
          <div className="cookie-buttons">
            <button className="button secondary" onClick={() => save(false)}>
              Reject optional
            </button>
            <button className="button secondary" onClick={() => save(true)}>
              Accept analytics
            </button>
            <button
              className="text-button"
              onClick={() => {
                setAnalytics(false);
                setOpen(true);
              }}
            >
              Customize
            </button>
          </div>
        </section>
      ) : null}
      {storageError ? (
        <p className="cookie-storage-error" role="status">
          {storageError}
        </p>
      ) : null}
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Trigger asChild>
          <button
            ref={settingsButton}
            className="cookie-settings-button"
            onClick={() => setAnalytics(choice?.analytics ?? false)}
          >
            Cookie settings
          </button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="modal-overlay" />
          <Dialog.Content
            className="app-modal cookie-modal"
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              settingsButton.current?.focus();
            }}
          >
            <Dialog.Title className="modal-title">
              Your cookie preferences
            </Dialog.Title>
            <Dialog.Description className="modal-description">
              You can change your mind at any time. Rejecting analytics does not
              affect your account or ability to send messages.
            </Dialog.Description>
            <div className="cookie-options">
              <Checkbox checked disabled>
                Essential storage — always on
                <span className="cookie-option-detail">
                  Sign-in sessions, security and remembering this choice.
                </span>
              </Checkbox>
              <Checkbox
                checked={analytics}
                onChange={(event) => setAnalytics(event.target.checked)}
              >
                Optional Google Analytics
                <span className="cookie-option-detail">
                  Public information page visits only. We do not send anonymous
                  messages, account details, or password links to Analytics.
                </span>
              </Checkbox>
            </div>
            <p className="fine">
              <Link href="/cookies">Read our cookie information</Link>.
              Withdrawing consent clears this site’s Analytics cookies and may
              reload the page.
            </p>
            <div className="cookie-modal-actions">
              <button className="button secondary" onClick={() => save(false)}>
                Reject optional
              </button>
              <button className="button" onClick={() => save(analytics)}>
                Save preferences
              </button>
              <Dialog.Close asChild>
                <button className="text-button">Cancel</button>
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
