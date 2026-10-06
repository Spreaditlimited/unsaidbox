import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { captchaConfig, verifyCaptcha } from "../lib/captcha.mjs";
import {
  analyticsPage,
  measurementId,
  parseConsent,
  consentLifetime,
} from "../lib/analytics-policy.mjs";
import { contactValues, contactEmail } from "../lib/contact.mjs";

const live = {
  NODE_ENV: "production",
  VERCEL: "1",
  VERCEL_ENV: "production",
  UNSAIDBOX_APP_URL: "https://unsaidbox.com",
  GOOGLE_CAPTCHA_SITE_KEY: "fixture-public",
  GOOGLE_CAPTCHA_SECRET_KEY: "fixture-secret",
};
const captchaForm = () => {
  const f = new FormData();
  f.set("captchaToken", "fixture-token-1234567890");
  return f;
};
const success = {
  success: true,
  action: "login",
  score: 0.9,
  hostname: "unsaidbox.com",
  challenge_ts: new Date().toISOString(),
};

test("CAPTCHA bypass is server-owned and local; deployed production cannot claim localhost", async () => {
  for (const env of [
    { ...live, NODE_ENV: "development", VERCEL: "" },
    { ...live, VERCEL_ENV: "preview" },
    { ...live, VERCEL: "", UNSAIDBOX_APP_URL: "http://127.0.0.1:3001" },
  ]) {
    assert.equal(captchaConfig(env).enabled, false);
    await verifyCaptcha(new FormData(), "login", {
      env,
      request: () => assert.fail("must not call Google locally"),
    });
  }
  assert.equal(
    captchaConfig({ ...live, UNSAIDBOX_APP_URL: "http://localhost:3001" })
      .enabled,
    true,
  );
  assert.equal(
    captchaConfig({ GOOGlE_CAPTCHA_SITE_KEY: "compatibility" }).siteKey,
    "compatibility",
  );
});
test("live v3 checks score, action, hostname, expiry and missing configuration", async () => {
  await verifyCaptcha(captchaForm(), "login", {
    env: live,
    request: async (url, options) => {
      assert.equal(url, "https://www.recaptcha.net/recaptcha/api/siteverify");
      assert.equal(options.method, "POST");
      assert.equal(options.body.get("secret"), "fixture-secret");
      return { ok: true, json: async () => success };
    },
  });
  for (const bad of [
    { score: 0.1 },
    { score: null },
    { score: NaN },
    { action: "sendContact" },
    { hostname: "attacker.example" },
    { success: false },
    { challenge_ts: new Date(Date.now() - 121000).toISOString() },
  ])
    await assert.rejects(
      verifyCaptcha(captchaForm(), "login", {
        env: live,
        request: async () => ({
          ok: true,
          json: async () => ({ ...success, ...bad }),
        }),
      }),
    );
  await assert.rejects(verifyCaptcha(new FormData(), "login", { env: live }));
  await assert.rejects(
    verifyCaptcha(captchaForm(), "login", {
      env: { ...live, GOOGLE_CAPTCHA_SECRET_KEY: "" },
    }),
  );
  await assert.rejects(
    verifyCaptcha(captchaForm(), "login", {
      env: live,
      request: async () => {
        throw Error("private-secret");
      },
    }),
    (error) => !error.message.includes("private-secret"),
  );
});
test("analytics allows only public information routes and valid measurement IDs", () => {
  for (const p of ["/", "/explore", "/safety", "/cookies"])
    assert.ok(analyticsPage(p));
  for (const p of [
    "/dashboard",
    "/admin",
    "/login",
    "/start",
    "/contact",
    "/verify-email",
    "/reset-password",
    "/q/private/answer",
    "/u/person",
    "/demo/answer",
    "/?token=secret",
  ])
    assert.equal(analyticsPage(p), null);
  assert.equal(measurementId("G-123TEST"), "G-123TEST");
  assert.equal(measurementId("<script>"), "");
});
test("consent defaults off and expires; malformed and future-dated choices are rejected", () => {
  const now = Date.now();
  for (const raw of [
    null,
    "invalid",
    "{}",
    JSON.stringify({ version: 1, analytics: true, expiresAt: now - 1 }),
    JSON.stringify({ version: 1, analytics: "yes", expiresAt: now + 1000 }),
  ])
    assert.equal(parseConsent(raw, now), null);
  assert.equal(
    parseConsent(
      JSON.stringify({
        version: 1,
        analytics: false,
        expiresAt: now + consentLifetime,
      }),
      now,
    ).analytics,
    false,
  );
});
test("contact form validates limits, honeypot, acknowledgement and header-safe email", () => {
  const f = new FormData();
  for (const [k, v] of Object.entries({
    name: "Example",
    email: "person@example.invalid",
    subject: "Test",
    message: "A test support enquiry",
    contactNotice: "on",
  }))
    f.set(k, v);
  const value = contactValues(f);
  assert.equal(value.email, "person@example.invalid");
  f.set("website", "spam");
  assert.throws(() => contactValues(f));
  f.delete("website");
  f.set("email", "person@example.invalid\r\nBcc:someone@example.invalid");
  assert.throws(() => contactValues(f));
  const mail = contactEmail({
    ...value,
    name: "<script>",
    message: "<img src=x>\nLine two",
  });
  assert.doesNotMatch(mail.html, /<script>|<img/);
  assert.match(mail.html, /&lt;img/);
  assert.match(mail.text, /Line two/);
});
test("all real checkboxes use the shared aligned control", async () => {
  const source = await readFile("components/ui/Checkbox.tsx", "utf8");
  assert.match(source, /type="checkbox"/);
  assert.match(source, /className="check-label"/);
  const css = await readFile("app/controls.css", "utf8");
  assert.match(css, /grid-template-columns: 20px minmax\(0, 1fr\)/);
  assert.match(css, /appearance: none/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /:disabled/);
});
