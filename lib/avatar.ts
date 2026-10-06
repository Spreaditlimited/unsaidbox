import "server-only";
import { db } from "./db";
import { cache } from "react";

export function avatarTableMissing(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2021"
  );
}

export const avatarState = cache(async (accountId: string) => {
  try {
    const avatar = await db().accountAvatar.findUnique({
      where: { accountId },
      select: { version: true },
    });
    return { ready: true, version: avatar?.version ?? null };
  } catch (error) {
    if (avatarTableMissing(error)) return { ready: false, version: null };
    throw error;
  }
});
