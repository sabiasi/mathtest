/**
 * GET or POST /api/billing/return/<provider>?order=mt-c-…
 *
 * Where the bank page sends the teacher's BROWSER back to (Flitt does it
 * with a POST, others with a normal link). We don't believe anything it
 * carries: we only forward to /billing/success, which asks our own server
 * whether the webhook has confirmed the payment.
 */
import { NextResponse } from "next/server";
import { siteOrigin } from "@/lib/payments/config";

function forward(request: Request): Response {
  const order = new URL(request.url).searchParams.get("order") ?? "";
  const target = new URL("/billing/success", siteOrigin(request));
  if (/^mt-c-[0-9a-f-]{36}$/.test(order)) target.searchParams.set("order", order);
  // 303 = "now GET that page", also after a POST.
  return NextResponse.redirect(target, 303);
}

export const GET = forward;
export const POST = forward;
