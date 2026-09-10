// A shirt is printed and posted the moment payment clears, so the few strings
// a customer controls get one cheap look before we commit to ink. This is a
// backstop against the obvious, not a substitute for review: matching is on
// whole words so ordinary names and places (Scunthorpe, Penistone) pass.

const BLOCKED = [
  'nigger', 'nigga', 'faggot', 'fag', 'tranny', 'kike', 'spic', 'chink',
  'wetback', 'raghead', 'coon', 'paki', 'gook', 'dyke', 'retard', 'retarded',
  'heil hitler', 'hitler', 'nazi', 'sieg heil', 'kkk', 'white power',
  'kill yourself', 'kys',
];

const LEET: Record<string, string> = {
  '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's',
};

function normalise(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(new RegExp('[' + '\u0300-\u036f' + ']', 'g'), '')
    .replace(/[013457@$]/g, (c) => LEET[c] ?? c)
    .replace(/[^a-z ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Returns a customer-facing reason, or null when the text is fine to print. */
export function reviewText(...parts: string[]): string | null {
  const text = ` ${normalise(parts.join(' '))} `;
  for (const term of BLOCKED) {
    if (text.includes(` ${term} `)) {
      return 'We are not able to print that wording. Please edit the name or place and try again.';
    }
  }
  return null;
}
