import "server-only";
import Stripe from "stripe";
import { requireEnvironment } from "@/lib/env";

let stripe: Stripe | null = null;
export function getStripe() {
  stripe ??= new Stripe(requireEnvironment("STRIPE_SECRET_KEY"));
  return stripe;
}

export function planFromPriceId(priceId: string | null | undefined) {
  if (priceId && priceId === process.env.STRIPE_PRICE_BUSINESS) return "business";
  if (priceId && priceId === process.env.STRIPE_PRICE_PRO) return "pro";
  return "free";
}

