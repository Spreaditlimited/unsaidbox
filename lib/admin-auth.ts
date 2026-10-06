import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";
import { digest, token } from "./security.mjs";

const cookieName = "unsaidbox_admin_session";
const options = {
  httpOnly: true,
  sameSite: "strict" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/admin",
};

export async function currentAdministrator() {
  const value = (await cookies()).get(cookieName)?.value;
  if (!value || !/^[a-f0-9]{64}$/.test(value)) return null;
  const session = await db().administratorSession.findUnique({
    where: { tokenHash: digest(value) },
    select: {
      expiresAt: true,
      administrator: { select: { id: true, email: true, displayName: true, active: true } },
    },
  });
  if (!session || session.expiresAt <= new Date() || !session.administrator.active) return null;
  return session.administrator;
}

export async function requireAdministrator() {
  const administrator = await currentAdministrator();
  if (!administrator) redirect("/admin/login");
  return administrator;
}

export async function beginAdministratorSession(administratorId: string) {
  const jar = await cookies();
  const previous = jar.get(cookieName)?.value;
  const value = token();
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);
  await db().$transaction(async (tx) => {
    if (previous) await tx.administratorSession.deleteMany({ where: { tokenHash: digest(previous) } });
    await tx.administratorSession.create({ data: { tokenHash: digest(value), administratorId, expiresAt } });
  });
  jar.set(cookieName, value, { ...options, expires: expiresAt });
}

export async function endAdministratorSession() {
  const jar = await cookies();
  const value = jar.get(cookieName)?.value;
  if (value) await db().administratorSession.deleteMany({ where: { tokenHash: digest(value) } });
  jar.set(cookieName, "", { ...options, maxAge: 0 });
}
