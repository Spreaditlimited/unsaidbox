"use client";
import { createContext, useContext } from "react";
type Config = { enabled: boolean; siteKey: string };
const Context = createContext<Config>({ enabled: false, siteKey: "" });
export function CaptchaProvider({
  config,
  children,
}: {
  config: Config;
  children: React.ReactNode;
}) {
  return <Context.Provider value={config}>{children}</Context.Provider>;
}
type GoogleCaptcha = {
  ready: (callback: () => void) => void;
  execute: (key: string, options: { action: string }) => Promise<string>;
};
declare global {
  interface Window {
    grecaptcha?: GoogleCaptcha;
    unsaidboxCaptchaReady?: () => void;
  }
}
let loading: Promise<GoogleCaptcha> | undefined;
function loadCaptcha(siteKey: string) {
  if (window.grecaptcha?.execute)
    return new Promise<GoogleCaptcha>((resolve) =>
      window.grecaptcha!.ready(() => resolve(window.grecaptcha!)),
    );
  return (loading ??= new Promise<GoogleCaptcha>((resolve, reject) => {
    const script = document.createElement("script");
    const timeout = window.setTimeout(() => {
      script.remove();
      loading = undefined;
      reject(new Error("CAPTCHA_LOAD"));
    }, 15000);
    window.unsaidboxCaptchaReady = () => {
      window.clearTimeout(timeout);
      if (window.grecaptcha)
        window.grecaptcha.ready(() => resolve(window.grecaptcha!));
    };
    script.src = `https://www.recaptcha.net/recaptcha/api.js?onload=unsaidboxCaptchaReady&render=${encodeURIComponent(siteKey)}`;
    script.async = true;
    script.onerror = () => {
      window.clearTimeout(timeout);
      script.remove();
      loading = undefined;
      reject(new Error("CAPTCHA_LOAD"));
    };
    document.head.appendChild(script);
  }));
}
export function useCaptcha() {
  const { enabled, siteKey } = useContext(Context);
  return async (form: FormData, action: string) => {
    if (!enabled) return;
    if (!siteKey) throw new Error("CAPTCHA_CONFIG");
    const api = await loadCaptcha(siteKey);
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const token = await Promise.race([
        api.execute(siteKey, { action }),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error("CAPTCHA_TIMEOUT")), 15000);
        }),
      ]);
      if (!token) throw new Error("CAPTCHA_EMPTY");
      form.set("captchaToken", token);
    } finally {
      clearTimeout(timer);
    }
  };
}
export function Captcha() {
  const { enabled } = useContext(Context);
  if (!enabled) return null;
  return (
    <p className="captcha-notice fine">
      This site is protected by reCAPTCHA and the Google{" "}
      <a
        href="https://policies.google.com/privacy"
        target="_blank"
        rel="noopener noreferrer"
      >
        Privacy Policy
      </a>{" "}
      and{" "}
      <a
        href="https://policies.google.com/terms"
        target="_blank"
        rel="noopener noreferrer"
      >
        Terms of Service
      </a>{" "}
      apply.
    </p>
  );
}
