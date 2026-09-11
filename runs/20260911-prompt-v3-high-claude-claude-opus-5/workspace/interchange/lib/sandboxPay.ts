import crypto from "node:crypto";

/**
 * A stand-in card authoriser used only when no Stripe credentials are present.
 * It deliberately mirrors Stripe's test card numbers so the same test data
 * works once real keys are added. It never touches a real card network.
 */
export type CardInput = { number: string; exp: string; cvc: string; name: string };
export type AuthResult =
  | { ok: true; authId: string; brand: string; last4: string }
  | { ok: false; code: string; message: string };

const SCRIPTED: Record<string, { code: string; message: string }> = {
  "4000000000000002": { code: "card_declined", message: "Your card was declined." },
  "4000000000009995": { code: "insufficient_funds", message: "Your card has insufficient funds." },
  "4000000000000069": { code: "expired_card", message: "Your card has expired." },
  "4000000000000127": { code: "incorrect_cvc", message: "Your card's security code is incorrect." },
};

function luhn(num: string): boolean {
  let sum = 0;
  let alt = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let d = num.charCodeAt(i) - 48;
    if (d < 0 || d > 9) return false;
    if (alt) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
    alt = !alt;
  }
  return num.length >= 12 && sum % 10 === 0;
}

function brandOf(num: string): string {
  if (/^4/.test(num)) return "Visa";
  if (/^5[1-5]/.test(num) || /^2[2-7]/.test(num)) return "Mastercard";
  if (/^3[47]/.test(num)) return "American Express";
  return "Card";
}

export function authorize(card: CardInput): AuthResult {
  const number = (card.number || "").replace(/\D/g, "");
  const cvc = (card.cvc || "").replace(/\D/g, "");
  const m = /^(\d{2})\s*\/\s*(\d{2,4})$/.exec((card.exp || "").trim());

  if (!card.name?.trim()) return { ok: false, code: "missing_name", message: "Enter the name on the card." };
  if (!number) return { ok: false, code: "invalid_number", message: "Enter a card number." };
  if (!m) return { ok: false, code: "invalid_expiry", message: "Enter the expiry as MM/YY." };

  const month = parseInt(m[1], 10);
  const year = m[2].length === 2 ? 2000 + parseInt(m[2], 10) : parseInt(m[2], 10);
  if (month < 1 || month > 12) return { ok: false, code: "invalid_expiry_month", message: "That expiry month is not valid." };
  const now = new Date();
  const expiryEnd = new Date(year, month, 1);
  if (expiryEnd <= now) return { ok: false, code: "expired_card", message: "That card has expired." };

  if (cvc.length < 3 || cvc.length > 4) return { ok: false, code: "invalid_cvc", message: "Enter the 3 or 4 digit security code." };

  const scripted = SCRIPTED[number];
  if (scripted) return { ok: false, ...scripted };

  if (!luhn(number)) return { ok: false, code: "invalid_number", message: "That card number is not valid." };

  return {
    ok: true,
    authId: "sbx_" + crypto.randomBytes(9).toString("hex"),
    brand: brandOf(number),
    last4: number.slice(-4),
  };
}
