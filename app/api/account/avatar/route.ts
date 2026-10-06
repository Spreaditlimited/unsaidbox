import { currentAccount } from "@/lib/auth";
import { db } from "@/lib/db";
import { avatarTableMissing } from "@/lib/avatar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
  Vary: "Cookie",
};

export async function GET() {
  const account = await currentAccount();
  if (!account) return new Response(null, { status: 401, headers });
  try {
    const avatar = await db().accountAvatar.findUnique({
      where: { accountId: account.id },
      select: { image: true },
    });
    if (!avatar) return new Response(null, { status: 404, headers });
    return new Response(new Uint8Array(avatar.image), {
      headers: {
        ...headers,
        "Content-Type": "image/webp",
        "Content-Security-Policy": "default-src 'none'",
        "Content-Disposition": 'inline; filename="profile.webp"',
      },
    });
  } catch (error) {
    return new Response(null, {
      status: avatarTableMissing(error) ? 404 : 503,
      headers,
    });
  }
}
