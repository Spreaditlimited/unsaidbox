"use server";
import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { requireAccount, rateLimit } from "@/lib/auth";
import { db } from "@/lib/db";
import { avatarTableMissing } from "@/lib/avatar";
import { prepareAvatar } from "@/lib/avatar-image.mjs";
import { InputError } from "@/lib/security.mjs";
import { verifyCaptcha } from "@/lib/captcha.mjs";

export type AvatarResult = {
  error?: string;
  success?: string;
  version?: string | null;
};

export async function saveAvatar(form: FormData): Promise<AvatarResult> {
  try {
    await verifyCaptcha(form, "saveAvatar");
    const account = await requireAccount();
    await rateLimit(`avatar:${account.id}`, 30, 3600);
    const operation = form.get("operation");
    if (operation === "remove") {
      await db().accountAvatar.deleteMany({ where: { accountId: account.id } });
      revalidatePath("/dashboard", "layout");
      revalidatePath("/admin");
      return { success: "Profile photo removed.", version: null };
    }
    if (operation !== "upload") return { error: "Choose an image action." };
    let image: Buffer;
    try {
      image = await prepareAvatar(form.get("photo"));
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Choose a valid photo.",
      };
    }
    const version = randomBytes(16).toString("hex");
    await db().accountAvatar.upsert({
      where: { accountId: account.id },
      create: { accountId: account.id, image: new Uint8Array(image), version },
      update: { image: new Uint8Array(image), version },
    });
    revalidatePath("/dashboard", "layout");
    revalidatePath("/admin");
    return { success: "Profile photo saved.", version };
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof InputError) return { error: error.message };
    if (avatarTableMissing(error))
      return {
        error: "Profile photos need the database setup step completed first.",
      };
    return { error: "Your photo could not be saved. Please try again." };
  }
}
