export const consentKey = "unsaidbox_cookie_consent_v1";
export const consentLifetime = 180 * 86400000;
const pages = new Map([
  ["/", "UnsaidBox"],
  ["/explore", "Explore"],
  ["/safety", "Privacy and safety"],
  ["/cookies", "Cookie information"],
  ["/blog", "Blog"],
]);
export function analyticsPage(path) {
  // Only the editorial namespace; never anonymous message/profile routes or media.
  if (/^\/blog\/(?!media$|feed$)[a-z0-9]+(?:-[a-z0-9]+)*$/.test(path)) return "Blog article";
  return pages.get(path) || null;
}
export function measurementId(value) {
  return /^G-[A-Z0-9]+$/.test(value || "") ? value : "";
}
export function parseConsent(raw, now = Date.now()) {
  try {
    const data = JSON.parse(raw || "null");
    if (
      data?.version !== 1 ||
      typeof data.analytics !== "boolean" ||
      !Number.isFinite(data.expiresAt) ||
      data.expiresAt <= now ||
      data.expiresAt > now + consentLifetime + 60000
    )
      return null;
    return data;
  } catch {
    return null;
  }
}
