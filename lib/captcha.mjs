import { InputError } from "./security.mjs";

const providerErrorCodes = new Set([
  "missing-input-secret", "invalid-input-secret", "missing-input-response",
  "invalid-input-response", "bad-request", "timeout-or-duplicate",
]);

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
  { env = process.env, request = fetch, log = console.warn } = {},
) {
  const config = captchaConfig(env);
  if (!config.enabled) return;
  // Only bounded diagnostic metadata: never tokens, keys, form data, IPs,
  // account identifiers, raw provider responses or exception messages.
  const reject = (reasons, message, details = {}) => {
    try {
      log("captcha_verification_failed", {
        action: typeof expectedAction === "string" && /^[a-zA-Z0-9_/]{1,64}$/.test(expectedAction)
          ? expectedAction : "invalid_action",
        reasons,
        ...details,
      });
    } catch { /* Logging failure must not bypass verification. */ }
    throw new InputError(message);
  };
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
    reject(["configuration_invalid"],
      "Bot protection is unavailable. Please try again later.",
    );
  const response = form.get("captchaToken");
  if (
    typeof response !== "string" ||
    response.length < 20 ||
    response.length > 4096
  )
    reject(["token_missing_or_malformed"],
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
    reject(["provider_unavailable"],
      "The security check could not connect. Please try again.",
    );
  }
  if (!result || typeof result !== "object" || Array.isArray(result))
    reject(["provider_response_malformed"], "The security check could not connect. Please try again.");
  const age = typeof result.challenge_ts === "string"
    ? Date.now() - Date.parse(result.challenge_ts) : NaN;
  const reasons = [];
  if (result.success !== true) reasons.push("provider_rejected");
  if (!hosts.includes(result.hostname)) reasons.push("hostname_mismatch");
  if (result.action !== expectedAction) reasons.push("action_mismatch");
  const validScore = Number.isFinite(result.score) && result.score >= 0 && result.score <= 1;
  if (!validScore) reasons.push("score_invalid");
  else if (result.score < threshold) reasons.push("score_below_threshold");
  if (!Number.isFinite(age)) reasons.push("timestamp_invalid");
  else if (age < -30000) reasons.push("timestamp_in_future");
  // challenge_ts is the challenge-load time, not token issuance. A freshly
  // executed token can carry an older timestamp in a long-lived dashboard.
  // Google's server-side siteverify success enforces expiry and single use;
  // expired/replayed tokens fail above with timeout-or-duplicate. Never infer
  // token expiry from challenge_ts or cache a successful verification.
  if (reasons.length)
    reject(reasons,
      "The security check did not accept this request. Please try again, or contact hello@unsaidbox.com if it continues.",
      {
        score: validScore ? result.score : null,
        threshold,
        providerCodes: Array.isArray(result["error-codes"])
          ? [...providerErrorCodes].filter(code => result["error-codes"].includes(code)) : [],
      },
    );
}
