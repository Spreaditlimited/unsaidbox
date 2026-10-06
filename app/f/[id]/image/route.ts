import { db } from "@/lib/db";
import { currentAccount } from "@/lib/auth";
export const dynamic = "force-dynamic";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const preview = new URL(request.url).searchParams.get("preview") === "1";
  const owner = preview ? await currentAccount() : null;
  if (preview && (!owner || owner.status !== "ACTIVE"))
    return new Response(null, { status: 404 });
  const form = await db().feedbackForm.findFirst({
    where: {
      id,
      ...(preview ? { accountId: owner!.id } : { linkActive: true }),
      blocked: false,
      account: { status: "ACTIVE" },
    },
    select: { image: true },
  });
  if (!form?.image) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(form.image), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
