// Numbers as spoken words, so the narration that build-script.mjs writes matches what the voice says
// and the figures come straight from summary.json instead of being retyped.
const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

function below1000(n) {
  const h = Math.floor(n / 100), r = n % 100;
  const parts = [];
  if (h) parts.push(`${ONES[h]} hundred`);
  if (r) parts.push(r < 20 ? ONES[r] : TENS[Math.floor(r / 10)] + (r % 10 ? `-${ONES[r % 10]}` : ''));
  return parts.join(' ');
}

/** 5284 -> "five thousand two hundred eighty-four" (integers up to 999,999). */
export function words(n) {
  n = Math.round(n);
  if (n < 0) return `minus ${words(-n)}`;
  if (n < 1000) return n === 0 ? 'zero' : below1000(n);
  const t = Math.floor(n / 1000), r = n % 1000;
  return `${below1000(t)} thousand${r ? ' ' + below1000(r) : ''}`;
}

/** 12.8 -> "twelve point eight" (one decimal). */
export function decimal(x, digits = 1) {
  const s = x.toFixed(digits);
  const [i, f] = s.split('.');
  return f && Number(f) ? `${words(Number(i))} point ${[...f].map((c) => ONES[Number(c)]).join(' ')}` : words(Number(i));
}

/** Whole seconds if close to whole, else one decimal: 5.6 -> "five point six", 12.04 -> "twelve". */
export function secs(x) {
  return Math.abs(x - Math.round(x)) < 0.05 ? words(x) : decimal(x, 1);
}

/** 0.9167 -> "ninety-two percent" */
export function pct(x) {
  return `${words(Math.round(x * 100))} percent`;
}

/** Capitalise the first letter of a sentence. */
export const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
