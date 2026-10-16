import { stripeClient } from "@/lib/stripe";
import { handleBillingEvent } from "@/lib/billing";
import { billingWebhookSecret } from '@/lib/billing-runtime.mjs';
export const runtime = "nodejs";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });
  const secret = billingWebhookSecret(process.env);
  if (!secret?.startsWith("whsec_")) return new Response("Webhook not configured", { status: 503 });
  // Bound the raw body even when Content-Length is absent or inaccurate.
  const reader = request.body?.getReader();
  if (!reader) return new Response("Missing body", { status: 400 });
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 1024 * 1024) { await reader.cancel(); return new Response("Payload too large", { status: 413 }); }
      chunks.push(value);
    }
  } catch { return new Response("Invalid body", { status: 400 }); }
  let stripe;
  try { stripe = stripeClient(); } catch { return new Response("Billing disabled", { status: 503 }); }
  let event;
  try { event = stripe.webhooks.constructEvent(Buffer.concat(chunks), signature, secret); }
  catch { return new Response("Invalid signature", { status: 400 }); }
  if (event.livemode !== (process.env.UNSAID_BILLING_MODE === 'live') || event.account) return new Response("Wrong billing environment", { status: 400 });
  try {
    await handleBillingEvent(event);
    return Response.json({ received: true });
  } catch {
    // A failure is not acknowledged: Stripe must retry. Never log event bodies.
    console.error("Billing webhook processing failed", { eventId: event.id, type: event.type });
    return new Response("Please retry", { status: 503 });
  }
}
