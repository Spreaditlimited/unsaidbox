export function userFilters(params = {}) {
  const value = key => typeof params[key] === "string" ? params[key] : "";
  const q = value("q").trim().slice(0, 100);
  const status = ["ACTIVE", "PENDING", "SUSPENDED"].includes(value("status")) ? value("status") : "";
  const verified = ["yes", "no"].includes(value("verified")) ? value("verified") : "";
  const page = /^\d{1,6}$/.test(value("page")) ? Math.max(1, Number(value("page"))) : 1;
  const sort = ["oldest", "name"].includes(value("sort")) ? value("sort") : "newest";
  const where = {
    ...(q ? { OR: ["email", "username", "displayName"].map(key => ({ [key]: { contains: q } })) } : {}),
    ...(status ? { status } : {}),
    ...(verified ? { emailVerifiedAt: verified === "yes" ? { not: null } : null } : {}),
  };
  return { q, status, verified, sort, page, where };
}

export function adminPageLink(path, values, page) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) if (typeof value === "string" && value) query.set(key, value);
  query.set("page", String(page));
  return `${path}?${query}`;
}

export function restoredAccountStatus(emailVerifiedAt) {
  return emailVerifiedAt ? "ACTIVE" : "PENDING";
}
