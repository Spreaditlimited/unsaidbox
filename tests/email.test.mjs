import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import {
  emailConfig,
  emailConfigured,
  appOrigin,
  sealEmail,
  openEmail,
} from "../lib/email-config.mjs";
import { renderEmail } from "../lib/email-templates.mjs";
import {
  eligibleForEmail,
  queueEmail,
  processEmailQueue,
} from "../lib/email-queue.mjs";
import { safeEmailError } from "../lib/email-transport.mjs";

const env = {
  UNSAIDBOX_EMAIL_ENABLED: "true",
  UNSAIDBOX_APP_URL: "https://unsaidbox.com",
  UNSAIDBOX_SMTP_HOST: "smtp.hostinger.com",
  UNSAIDBOX_SMTP_PORT: "465",
  UNSAIDBOX_SMTP_USER: "hello@unsaidbox.com",
  UNSAIDBOX_SMTP_PASSWORD: "unit-test-only",
  UNSAIDBOX_EMAIL_KEY: randomBytes(32).toString("hex"),
};

test("email configuration fails closed and always verifies Hostinger TLS", () => {
  assert.equal(emailConfigured({}), false);
  assert.equal(
    emailConfigured({ ...env, UNSAIDBOX_EMAIL_ENABLED: "false" }),
    false,
  );
  const config = emailConfig(env);
  assert.equal(config.smtp.secure, true);
  assert.equal(config.smtp.requireTLS, true);
  assert.equal(config.smtp.tls.rejectUnauthorized, true);
  assert.equal(config.smtp.disableUrlAccess, true);
  assert.equal(
    emailConfig({ ...env, UNSAIDBOX_SMTP_PORT: "587" }).smtp.secure,
    false,
  );
  assert.throws(() =>
    emailConfig({ ...env, UNSAIDBOX_SMTP_HOST: "attacker.example" }),
  );
  assert.throws(() =>
    appOrigin({
      UNSAIDBOX_APP_URL: "http://unsaidbox.com",
      NODE_ENV: "production",
    }),
  );
  assert.throws(() =>
    appOrigin({ UNSAIDBOX_APP_URL: "https://user:secret@unsaidbox.com" }),
  );
  const special = "#'\"$:= spaces";
  assert.equal(
    emailConfig({
      ...env,
      UNSAIDBOX_SMTP_PASSWORD_B64: Buffer.from(special).toString("base64"),
    }).smtp.auth.pass,
    special,
  );
});

test("queued bearer links are encrypted and reject tampering", () => {
  const key = randomBytes(32);
  const payload = {
    url: "https://unsaidbox.com/reset-password?token=private",
    tokenHash: "hash",
  };
  const encrypted = sealEmail(payload, key);
  assert.ok(!encrypted.includes("private"));
  assert.deepEqual(openEmail(encrypted, key), payload);
  assert.notEqual(sealEmail(payload, key), encrypted);
  assert.throws(() => openEmail(encrypted, randomBytes(32)));
  const tampered = Buffer.from(encrypted, "base64");
  tampered[tampered.length - 1] ^= 1;
  assert.throws(() => openEmail(tampered.toString("base64"), key));
});

test("every email has UnsaidBox branding, escaped names and plain text without anonymous content", () => {
  for (const kind of [
    "VERIFY",
    "RESET",
    "WELCOME",
    "PASSWORD_CHANGED",
    "NEW_MESSAGE",
    "NEW_ANSWER",
    "REPORT",
    "SUSPENDED",
    "RESTORED",
    "TEST",
  ]) {
    const rendered = renderEmail(kind, {
      name: "<img src=x onerror=alert(1)>",
      url: "https://unsaidbox.com/dashboard",
      origin: "https://unsaidbox.com",
      body: "PRIVATE SECRET",
    });
    assert.match(rendered.html, /Unsaid<span/);
    assert.match(rendered.text, /UnsaidBox/);
    assert.match(rendered.html, /hello@unsaidbox.com/);
    assert.match(rendered.html, /&lt;img/);
    assert.doesNotMatch(rendered.html, /<img|PRIVATE SECRET/);
    assert.doesNotMatch(rendered.text, /PRIVATE SECRET/);
    assert.match(rendered.html, /role="presentation"/);
  }
  assert.throws(() =>
    renderEmail("RESET", {
      url: "https://attacker.example",
      origin: "https://unsaidbox.com",
    }),
  );
  assert.throws(() =>
    renderEmail("RESET", {
      url: "javascript:alert(1)",
      origin: "https://unsaidbox.com",
    }),
  );
  assert.match(
    renderEmail("NEW_MESSAGE", {
      url: "https://unsaidbox.com/dashboard",
      origin: "https://unsaidbox.com",
    }).text,
    /Manage email preferences/,
  );
});

test("optional emails require a verified active owner and their current opt-in", () => {
  const account = {
    status: "ACTIVE",
    emailVerifiedAt: new Date(),
    role: "USER",
  };
  assert.equal(eligibleForEmail({ kind: "NEW_MESSAGE" }, account, null), false);
  assert.equal(
    eligibleForEmail({ kind: "NEW_MESSAGE" }, account, { newMessages: true }),
    true,
  );
  assert.equal(
    eligibleForEmail(
      { kind: "NEW_ANSWER" },
      { ...account, emailVerifiedAt: null },
      { newMessages: true },
    ),
    false,
  );
  assert.equal(
    eligibleForEmail(
      { kind: "NEW_MESSAGE" },
      { ...account, status: "SUSPENDED" },
      { newMessages: true },
    ),
    false,
  );
  assert.equal(
    eligibleForEmail({ kind: "REPORT" }, account, { moderationReports: true }),
    false,
  );
  assert.equal(
    eligibleForEmail(
      { kind: "REPORT" },
      { ...account, role: "ADMIN" },
      { moderationReports: true },
    ),
    false,
  );
  assert.equal(
    eligibleForEmail({ kind: "PASSWORD_CHANGED" }, account, null),
    true,
  );
  assert.equal(eligibleForEmail({ kind: "VERIFY" }, account, null), false);
});

// Small isolated store for worker behaviour: no network or real database access.
function store(kind = "WELCOME") {
  const job = {
    id: "test-job",
    accountId: "test-owner",
    kind,
    status: "PENDING",
    attempts: 0,
    expiresAt: new Date(Date.now() + 3600000),
    nextAttemptAt: new Date(),
    lockedAt: null,
    payload: sealEmail(
      { url: "https://unsaidbox.com/dashboard", tokenHash: null },
      Buffer.from(env.UNSAIDBOX_EMAIL_KEY, "hex"),
    ),
  };
  const account = {
    email: "fixture@example.invalid",
    displayName: "Fixture",
    status: "ACTIVE",
    emailVerifiedAt: new Date(),
    role: "USER",
    emailPreference: { newMessages: true },
  };
  const client = {
    emailDelivery: {
      findMany: async () => (job.status === "PENDING" ? [{ ...job }] : []),
      updateMany: async ({ where, data }) => {
        if (
          !where.id ||
          job.id !== where.id ||
          job.status !== where.status ||
          (where.lockedAt && job.lockedAt !== where.lockedAt)
        )
          return { count: 0 };
        Object.assign(job, data, {
          attempts:
            typeof data.attempts === "object"
              ? job.attempts + data.attempts.increment
              : (data.attempts ?? job.attempts),
        });
        return { count: 1 };
      },
    },
    account: { findUnique: async () => account },
    authToken: { findUnique: async () => null },
    rateLimit: { upsert: async () => ({ count: 1 }) },
  };
  return { job, account, client };
}

test("queue uses hashed dedupe keys and encrypted payload, not plaintext links", async () => {
  Object.assign(process.env, env);
  let written;
  await queueEmail(
    {
      emailDelivery: {
        upsert: async (value) => {
          written = value;
        },
      },
    },
    {
      accountId: "owner",
      kind: "VERIFY",
      key: "secret-token",
      path: "/verify-email?token=secret-token",
    },
  );
  assert.equal(written.create.dedupeKey.length, 64);
  assert.equal(JSON.stringify(written).includes("secret-token"), false);
});

test("worker marks accepted mail once, clears payload, and ignores a competing worker", async () => {
  Object.assign(process.env, env);
  const { client, job } = store();
  let calls = 0;
  const deliver = async () => {
    calls++;
  };
  await Promise.all([
    processEmailQueue(client, { deliver }),
    processEmailQueue(client, { deliver }),
  ]);
  assert.equal(calls, 1);
  assert.equal(job.status, "SENT");
  assert.equal(job.payload, null);
  await processEmailQueue(client, { deliver });
  assert.equal(calls, 1);
});

test("SMTP failures are retried with a safe error code, never reported as sent", async () => {
  Object.assign(process.env, env);
  const { client, job } = store();
  await processEmailQueue(client, {
    deliver: async () => {
      throw Object.assign(new Error("secret email and password"), {
        code: "EAUTH",
      });
    },
  });
  assert.equal(job.status, "PENDING");
  assert.equal(job.attempts, 1);
  assert.equal(job.lastError, "SMTP_AUTH");
  assert.ok(job.nextAttemptAt > new Date());
  assert.ok(job.payload);
  assert.equal(job.sentAt, undefined);
  assert.equal(safeEmailError(new Error("private data")), "EMAIL_FAILED");
});

test("worker cancels opted-out notifications and superseded token emails", async () => {
  Object.assign(process.env, env);
  for (const kind of ["NEW_MESSAGE", "RESET"]) {
    const { client, job, account } = store(kind);
    account.emailPreference.newMessages = false;
    await processEmailQueue(client, {
      deliver: async () => assert.fail("must not send"),
    });
    assert.equal(job.status, "CANCELLED");
    assert.equal(job.payload, null);
  }
});

test("GET auth screens never consume tokens; POST actions use expiry, single-use and session revocation", async () => {
  for (const file of [
    "app/verify-email/page.tsx",
    "app/reset-password/page.tsx",
  ]) {
    const source = await readFile(file, "utf8");
    assert.match(source, /<AuthShell/);
    assert.match(source, /<ActionForm/);
    assert.doesNotMatch(source, /db\(\)|deleteMany|updateMany/);
  }
  const actions = await readFile("app/email-actions.ts", "utf8");
  assert.match(actions, /expiresAt: \{ gt: new Date\(\) \}/);
  assert.match(actions, /if \(!consumed.count\)/);
  assert.match(actions, /tx.session.deleteMany/);
  assert.match(actions, /const moderationReports = false/);
  assert.match(actions, /If an eligible account uses that email/);
  const worker = await readFile(
    "app/api/internal/email-worker/route.ts",
    "utf8",
  );
  assert.match(worker, /timingSafeEqual/);
  assert.match(worker, /status: 401/);
});
