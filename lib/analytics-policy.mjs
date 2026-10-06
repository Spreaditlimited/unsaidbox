export const consentKey = "unsaidbox_cookie_consent_v1";
export const consentLifetime = 180 * 86400000;
const pages = new Map([
  ["/", "UnsaidBox"],
  ["/explore", "Explore"],
  ["/safety", "Privacy and safety"],
  ["/cookies", "Cookie information"],
  ["/demo", "Product demo"],
  ["/demo/thread", "Example thread"],
  ["/demo/share", "Example sharing studio"],
]);
export function analyticsPage(path) {
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
