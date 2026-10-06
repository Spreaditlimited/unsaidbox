import { InputError } from "./security.mjs";

export function captchaConfig(env = process.env) {
  const siteKey =
    env.UNSAIDBOX_RECAPTCHA_SITE_KEY ||
    env.GOOGLE_CAPTCHA_SITE_KEY ||
    env.GOOGlE_CAPTCHA_SITE_KEY ||
    "";
  const secret =
    env.UNSAIDBOX_RECAPTCHA_SECRET || env.GOOGLE_CAPTCHA_SECRET_KEY || "";
  // Server-owned deployment state only, never a caller-supplied Host header.
  let localApp = false;
  try {
    localApp = ["localhost", "127.0.0.1", "[::1]"].includes(
      new URL(env.UNSAIDBOX_APP_URL).hostname,
    );
  } catch {}
  const enabled = env.VERCEL
    ? env.VERCEL_ENV === "production"
    : env.NODE_ENV === "production" && !localApp;
  return { siteKey, secret, enabled };
}
export async function verifyCaptcha(
  form,
  expectedAction,
  { env = process.env, request = fetch } = {},
) {
  const config = captchaConfig(env);
  if (!config.enabled) return;
  let defaultHost = "";
  try {
    defaultHost = new URL(env.UNSAIDBOX_APP_URL).hostname;
  } catch {}
  const hosts = (env.UNSAIDBOX_RECAPTCHA_HOSTNAMES || defaultHost)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const threshold = Number(env.UNSAIDBOX_RECAPTCHA_MIN_SCORE || "0.5");
  if (
    !config.secret ||
    !config.siteKey ||
    !hosts.length ||
    !Number.isFinite(threshold) ||
    threshold < 0 ||
    threshold > 1
  )
    throw new InputError(
      "Bot protection is unavailable. Please try again later.",
    );
  const response = form.get("captchaToken");
  if (
    typeof response !== "string" ||
    response.length < 20 ||
    response.length > 4096
  )
    throw new InputError(
      "The security check could not verify this request. Please try again.",
    );
  let result;
  try {
    const http = await request(
      "https://www.recaptcha.net/recaptcha/api/siteverify",
      {
        method: "POST",
        body: new URLSearchParams({ secret: config.secret, response }),
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!http.ok) throw new Error("CAPTCHA_HTTP");
    result = await http.json();
  } catch {
    throw new InputError(
      "The security check could not connect. Please try again.",
    );
  }
  const age = Date.now() - Date.parse(result.challenge_ts);
  if (
    result.success !== true ||
    !hosts.includes(result.hostname) ||
    result.action !== expectedAction ||
    !Number.isFinite(result.score) ||
    result.score < threshold ||
    result.score > 1 ||
    !Number.isFinite(age) ||
    age < -30000 ||
    age > 120000
  )
    throw new InputError(
      "The security check did not accept this request. Please try again, or contact hello@unsaidbox.com if it continues.",
    );
}
