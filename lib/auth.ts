import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";
import { digest, token, InputError } from "./security.mjs";
const cookieName = "unsaidbox_session";
export async function currentAccount() {
  const value = (await cookies()).get(cookieName)?.value;
  if (!value || !/^[a-f0-9]{64}$/.test(value)) return null;
  const session = await db().session.findUnique({
    where: { tokenHash: digest(value) },
    select: {
      expiresAt: true,
      account: {
        select: {
          id: true,
          email: true,
          emailVerifiedAt: true,
          username: true,
          displayName: true,
          introduction: true,
          status: true,
          role: true,
          publicPageEnabled: true,
          inboxOpen: true,
          inboxSharingPolicy: true,
        },
      },
    },
  });
  if (
    !session ||
    session.expiresAt <= new Date() ||
    session.account.status === "SUSPENDED"
  )
    return null;
  return session.account;
}
export async function requireAccount(active = true) {
  const account = await currentAccount();
  if (!account) redirect("/login");
  if (active && account.status !== "ACTIVE") redirect("/dashboard");
  return account;
}
export async function beginSession(accountId: string) {
  const value = token();
  const expiresAt = new Date(Date.now() + 7 * 86400_000);
  await db().session.create({
    data: { tokenHash: digest(value), accountId, expiresAt },
    select: { accountId: true },
  });
  (await cookies()).set(cookieName, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}
export async function endSession() {
  const jar = await cookies();
  const value = jar.get(cookieName)?.value;
  if (value)
    await db().session.deleteMany({ where: { tokenHash: digest(value) } });
  jar.delete(cookieName);
}
// Shared, atomic fixed-window budgets. Keys contain hashes, never raw emails/IPs.
export async function rateLimit(subject: string, limit: number, seconds = 900) {
  const bucket = Math.floor(Date.now() / (seconds * 1000));
  const key = digest(`${subject}:${bucket}`);
  const row = await db().rateLimit.upsert({
    where: { key },
    create: {
      key,
      count: 1,
      expiresAt: new Date((bucket + 1) * seconds * 1000),
    },
    update: { count: { increment: 1 } },
  });
  if (row.count > limit)
    throw new InputError("Too many attempts. Please try again later.");
}
