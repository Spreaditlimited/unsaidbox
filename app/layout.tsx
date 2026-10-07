import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./workspace.css";
import "./auth.css";
import "./controls.css";
import "./contact.css";
import "./privacy-controls.css";
import { CookieConsent } from "@/components/CookieConsent";
import { measurementId } from "@/lib/analytics-policy.mjs";
import { CaptchaProvider } from "@/components/Captcha";
import { captchaConfig } from "@/lib/captcha.mjs";
import { siteOrigin, siteDescription, socialMetadata } from "@/lib/social-metadata";

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: {
    default: "UnsaidBox — A place for the unsaid",
    template: "%s · UnsaidBox",
  },
  description: siteDescription,
  ...socialMetadata({ title: "UnsaidBox — A place for the unsaid", description: siteDescription }),
  robots: { index: false, follow: false },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FAF9F6",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <CaptchaProvider
          config={{
            enabled: captchaConfig().enabled,
            siteKey: captchaConfig().siteKey,
          }}
        >
          {children}
        </CaptchaProvider>
        <CookieConsent
          id={measurementId(
            process.env.UNSAIDBOX_GA_MEASUREMENT_ID ||
              process.env.GOOGLE_ANALYTICS_TAG,
          )}
        />
      </body>
    </html>
  );
}
