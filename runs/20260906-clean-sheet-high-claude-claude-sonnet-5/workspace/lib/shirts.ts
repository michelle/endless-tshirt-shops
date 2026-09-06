export type StatusClass = "2xx" | "3xx" | "4xx" | "5xx";

export type Shirt = {
  slug: string;
  code: string;
  title: string;
  flavor: string;
  description: string;
  statusClass: StatusClass;
  bg: string;
  fg: string;
  accent: string;
  priceCents: number;
};

// Color per HTTP status class. Chosen to read clearly at a glance the way
// terminals and API tools (curl -v, httpstat, browser devtools) colorize them.
export const CLASS_COLORS: Record<StatusClass, { bg: string; fg: string; accent: string; label: string }> = {
  "2xx": { bg: "#046c4e", fg: "#f0fdf4", accent: "#6ee7b7", label: "Success" },
  "3xx": { bg: "#075985", fg: "#f0f9ff", accent: "#7dd3fc", label: "Redirection" },
  "4xx": { bg: "#9a3412", fg: "#fff7ed", accent: "#fdba74", label: "Client Error" },
  "5xx": { bg: "#991b1b", fg: "#fef2f2", accent: "#fca5a5", label: "Server Error" },
};

export const SHIRTS: Shirt[] = [
  {
    slug: "200-ok",
    code: "200",
    title: "OK",
    flavor: "The one status code you actually want to see.",
    description:
      "Clean, confident, deployed on a Friday and nothing broke. The 200 OK tee is for the optimists — the ones who ship and trust the pipeline.",
    statusClass: "2xx",
    ...CLASS_COLORS["2xx"],
    priceCents: 2900,
  },
  {
    slug: "201-created",
    code: "201",
    title: "CREATED",
    flavor: "For the builders. Something new exists because of you.",
    description:
      "A resource was created, right there in the Location header. Wear it after you ship a new feature, a new project, or a new personal record.",
    statusClass: "2xx",
    ...CLASS_COLORS["2xx"],
    priceCents: 2900,
  },
  {
    slug: "301-moved-permanently",
    code: "301",
    title: "MOVED PERMANENTLY",
    flavor: "New job, new city, new life. Update your bookmarks.",
    description:
      "You're not coming back. The 301 tee is the official shirt of career changes, big moves, and permanent redirects — with the SEO juice intact.",
    statusClass: "3xx",
    ...CLASS_COLORS["3xx"],
    priceCents: 2900,
  },
  {
    slug: "304-not-modified",
    code: "304",
    title: "NOT MODIFIED",
    flavor: "Nothing to see here. Serve from cache.",
    description:
      "Same as last time you checked. For people who haven't changed a thing since 2019 and are proud of it.",
    statusClass: "3xx",
    ...CLASS_COLORS["3xx"],
    priceCents: 2900,
  },
  {
    slug: "403-forbidden",
    code: "403",
    title: "FORBIDDEN",
    flavor: "We know you're there. You're just not allowed in.",
    description:
      "Not a 401 — this isn't about who you are, it's about what you're allowed to do. For anyone who's ever been quietly locked out of a meeting, a repo, or a group chat.",
    statusClass: "4xx",
    ...CLASS_COLORS["4xx"],
    priceCents: 2900,
  },
  {
    slug: "404-not-found",
    code: "404",
    title: "NOT FOUND",
    flavor: "The most famous error on the internet. Now wearable.",
    description:
      "The original internet meme, decades before memes were a category. If you've ever lost your keys, your train of thought, or your will to attend a meeting — this is your shirt.",
    statusClass: "4xx",
    ...CLASS_COLORS["4xx"],
    priceCents: 2900,
  },
  {
    slug: "418-im-a-teapot",
    code: "418",
    title: "I'M A TEAPOT",
    flavor: "RFC 2324. A real status code. We don't make the rules.",
    description:
      "Yes, it's real. In 1998 the IETF defined 418 for servers that refuse to brew coffee because they are, in fact, a teapot. It has outlived several startups. Respect the bit.",
    statusClass: "4xx",
    ...CLASS_COLORS["4xx"],
    priceCents: 3200,
  },
  {
    slug: "429-too-many-requests",
    code: "429",
    title: "TOO MANY REQUESTS",
    flavor: "Slow down. Rate limit exceeded.",
    description:
      "For the group chat that won't stop, the manager who keeps pinging, and the API you're hammering way past the documented quota. Retry-After: never.",
    statusClass: "4xx",
    ...CLASS_COLORS["4xx"],
    priceCents: 2900,
  },
  {
    slug: "500-internal-server-error",
    code: "500",
    title: "INTERNAL SERVER ERROR",
    flavor: "Something went wrong. We're not going to say what.",
    description:
      "Vague, ominous, and universally understood. The 500 tee is for the days when everything is on fire and the stack trace is a personal attack.",
    statusClass: "5xx",
    ...CLASS_COLORS["5xx"],
    priceCents: 2900,
  },
  {
    slug: "503-service-unavailable",
    code: "503",
    title: "SERVICE UNAVAILABLE",
    flavor: "Down for maintenance. Please try again later.",
    description:
      "Whether it's the servers or just you today, 503 says it politely: not right now. Comes with an implied Retry-After you have no intention of honoring.",
    statusClass: "5xx",
    ...CLASS_COLORS["5xx"],
    priceCents: 2900,
  },
];

export const SIZES = ["S", "M", "L", "XL", "2XL"] as const;
export type Size = (typeof SIZES)[number];

export function getShirt(slug: string): Shirt | undefined {
  return SHIRTS.find((s) => s.slug === slug);
}
