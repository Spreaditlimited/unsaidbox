import { createHash } from "node:crypto";
import {
  emailConfig,
  emailConfigured,
  openEmail,
  sealEmail,
} from "./email-config.mjs";
import { sendEmail, safeEmailError } from "./email-transport.mjs";

const hash = (value) => createHash("sha256").update(value).digest("hex");
const optionalKinds = ["NEW_MESSAGE", "NEW_ANSWER", "REPORT"];

// Accepts a Prisma transaction so the user action and email intent commit together.
/** @param {any} client @param {{accountId: string, kind: string, key: string, path: string, tokenHash?: string | null, expiresAt?: Date}} options */
export async function queueEmail(
  client,
  {
    accountId,
    kind,
    key,
    path,
    tokenHash = null,
    expiresAt = new Date(Date.now() + 86400000),
  },
) {
  const config = emailConfig();
  const url =
    path === "mailto:hello@unsaidbox.com"
      ? path
      : new URL(path, config.origin).href;
  if (
    url !== "mailto:hello@unsaidbox.com" &&
    new URL(url).origin !== config.origin
  )
    throw new Error("EMAIL_LINK");
  await client.emailDelivery.upsert({
    where: { dedupeKey: hash(key) },
    create: {
      accountId,
      kind,
      dedupeKey: hash(key),
      payload: sealEmail({ url, tokenHash }, config.key),
      expiresAt,
    },
    update: {},
  });
}

export async function queueActivityEmail(client, accountId, isAnswer) {
  if (!emailConfigured()) return;
  const preference = await client.emailPreference.findUnique({
    where: { accountId },
  });
  if (!preference?.newMessages) return;
  await queueEmail(client, {
    accountId,
    kind: isAnswer ? "NEW_ANSWER" : "NEW_MESSAGE",
    key: `activity:${accountId}:${Math.floor(Date.now() / 3600000)}`,
    path: "/dashboard?view=inbox",
  });
}

export function eligibleForEmail(job, account, preference) {
  if (!account) return false;
  if (job.kind === "VERIFY")
    return account.status !== "SUSPENDED" && !account.emailVerifiedAt;
  if (job.kind === "RESET") return account.status !== "SUSPENDED";
  if (!account.emailVerifiedAt) return false;
  if (job.kind === "SUSPENDED") return account.status === "SUSPENDED";
  if (account.status !== "ACTIVE") return false;
  if (["NEW_MESSAGE", "NEW_ANSWER"].includes(job.kind))
    return Boolean(preference?.newMessages);
  // Legacy personal-account admin flags do not authorize admin notifications.
  if (job.kind === "REPORT") return false;
  return true;
}

async function budget(client, kind) {
  // Shared limits protect the purchased mailbox. Reserve capacity for auth/security.
  const limits = optionalKinds.includes(kind)
    ? [["optional-hour", 3600000, 20]]
    : [];
  limits.push(["all-hour", 3600000, 50], ["all-day", 86400000, 100]);
  for (const [name, milliseconds, limit] of limits) {
    const bucket = Math.floor(Date.now() / milliseconds);
    const key = hash(`email-budget:${name}:${bucket}`);
    const row = await client.rateLimit.upsert({
      where: { key },
      create: {
        key,
        count: 1,
        expiresAt: new Date((bucket + 1) * milliseconds),
      },
      update: { count: { increment: 1 } },
    });
    if (row.count > limit) return false;
  }
  return true;
}

export async function processEmailQueue(
  client,
  { limit = 3, deliver = sendEmail } = {},
) {
  if (!emailConfigured()) throw new Error("EMAIL_DISABLED");
  const config = emailConfig();
  const now = new Date();
  // Recover crashed workers, but never race a live SMTP request (timeouts < lease).
  await client.emailDelivery.updateMany({
    where: {
      status: "PROCESSING",
      lockedAt: { lt: new Date(Date.now() - 300000) },
    },
    data: { status: "PENDING", lockedAt: null },
  });
  await client.emailDelivery.updateMany({
    where: { status: { in: ["PENDING", "FAILED"] }, expiresAt: { lte: now } },
    data: { status: "EXPIRED", payload: null, lockedAt: null },
  });
  const jobs = await client.emailDelivery.findMany({
    where: {
      status: "PENDING",
      nextAttemptAt: { lte: now },
      expiresAt: { gt: now },
    },
    orderBy: { createdAt: "asc" },
    take: Math.min(10, Math.max(1, limit)),
  });
  const result = { accepted: 0, retried: 0, cancelled: 0, deferred: 0 };
  for (const job of jobs) {
    const lockedAt = new Date();
    const claimed = await client.emailDelivery.updateMany({
      where: { id: job.id, status: "PENDING" },
      data: { status: "PROCESSING", lockedAt },
    });
    if (!claimed.count) continue;
    const finish = (data) =>
      client.emailDelivery.updateMany({
        where: { id: job.id, status: "PROCESSING", lockedAt },
        data: { ...data, lockedAt: null },
      });
    try {
      const account = await client.account.findUnique({
        where: { id: job.accountId },
        select: {
          email: true,
          displayName: true,
          emailVerifiedAt: true,
          status: true,
          role: true,
          emailPreference: true,
        },
      });
      const payload = openEmail(job.payload, config.key);
      const authToken = payload.tokenHash
        ? await client.authToken.findUnique({
            where: { tokenHash: payload.tokenHash },
          })
        : null;
      if (
        !eligibleForEmail(job, account, account?.emailPreference) ||
        (["VERIFY", "RESET"].includes(job.kind) &&
          (!authToken ||
            authToken.accountId !== job.accountId ||
            authToken.purpose !== job.kind ||
            authToken.expiresAt <= new Date()))
      ) {
        await finish({ status: "CANCELLED", payload: null });
        result.cancelled++;
        continue;
      }
      if (!(await budget(client, job.kind))) {
        await finish({
          status: "PENDING",
          nextAttemptAt: new Date(Date.now() + 3600000),
          lastError: "MAILBOX_BUDGET",
        });
        result.deferred++;
        continue;
      }
      await deliver({
        kind: job.kind,
        to: account.email,
        name: account.displayName,
        url: payload.url,
        id: job.id,
      });
      await finish({
        status: "SENT",
        sentAt: new Date(),
        payload: null,
        attempts: { increment: 1 },
        lastError: null,
      });
      result.accepted++;
    } catch (error) {
      const attempts = job.attempts + 1;
      const failed = attempts >= 6;
      await finish({
        status: failed ? "FAILED" : "PENDING",
        attempts,
        payload: failed ? null : job.payload,
        nextAttemptAt: new Date(
          Date.now() + Math.min(3600000, 60000 * 2 ** attempts),
        ),
        lastError: safeEmailError(error),
      });
      result.retried++;
    }
  }
  return result;
}
