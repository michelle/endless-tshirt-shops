export type Storefront = {
  screenshot: string;
  favicon: { path: string; source: string; mime: string } | null;
  faviconStatus?: "found" | "missing" | "unavailable";
  socialPreview?: { path: string; source: string; mime: string; tag: string; width: number; height: number; capturedAt: string } | null;
  socialPreviewStatus?: "found" | "missing" | "unavailable";
  url: string;
  title: string;
  width: number;
  height: number;
  capturedAt: string;
  httpStatus: number | null;
  errors: string[];
};

export type Run = {
  id: string;
  model: string;
  commit: string;
  status: string;
  deployment: string | null;
  finalOutput: string;
  design: string | null;
  width: number | null;
  height: number | null;
  alpha: string;
  evidence: string;
};

export type Suite = {
  id: string;
  label: string;
  incomplete?: boolean;
  summary: string;
  prompt: { path: string; file: string; revision: string; sha256: string };
  runs: Run[];
};

const models = {
  astra: "Codex · gpt-6-astra",
  sol: "Codex · gpt-5.6-sol",
  terra: "Codex · gpt-5.6-terra",
  luna: "Codex · gpt-5.6-luna",
  fable: "Claude · claude-fable-5-1",
  opus: "Claude · claude-opus-5",
  sonnet: "Claude · claude-sonnet-5",
};

export const suites: Suite[] = [
  {
    id: "20260908-prompt-v3-rerun2-high",
    label: "2026-09-08 · Prompt v3 · Second rerun",
    summary: "/suites/20260908-prompt-v3-rerun2-high/summary.md",
    prompt: { path: "/suites/20260908-prompt-v3-rerun2-high/prompt.md", file: "prompt-v3.md", revision: "1e9a34acb43bde2a03857309dc46185252f1718d", sha256: "30868370940510cfeb6f8c1da9e0f748ad6ac4f3e1e5e59e3e85adcecc910f99" },
    runs: [
      {
        id: "astra", model: models.astra, commit: "7c3af4ae", status: "Paid E2E · completed asset",
        deployment: "https://benchmark-20260908-prompt-v3-rerun2.vercel.app",
        finalOutput: "/suites/20260908-prompt-v3-rerun2-high/runs/20260908-prompt-v3-rerun2-high-codex-gpt-6-astra/final.md",
        design: "/suites/20260908-prompt-v3-rerun2-high/runs/20260908-prompt-v3-rerun2-high-codex-gpt-6-astra/design.png",
        width: 2490, height: 3510, alpha: "RGBA transparency · exact paid-order source · 300 DPI",
        evidence: "A genuine paid Stripe test checkout linked to Prodigi order ord_1171056. This archived 2490×3510 Daymark source is an exact MD5 match and Prodigi completed the asset for a natural/M Bella + Canvas 3001. Physical output remains unverified. Synthetic Stripe placeholders were renamed solely to pass the mandatory publication scan; the model was not rerun.",
      },
      {
        id: "sol", model: models.sol, commit: "357a6653", status: "Deployed · payment unverified",
        deployment: "https://benchmark-20260908-prompt-v3-rerun2-one.vercel.app",
        finalOutput: "/suites/20260908-prompt-v3-rerun2-high/runs/20260908-prompt-v3-rerun2-high-codex-gpt-5.6-sol/final.md",
        design: "/suites/20260908-prompt-v3-rerun2-high/runs/20260908-prompt-v3-rerun2-high-codex-gpt-5.6-sol/design.png",
        width: 618, height: 753, alpha: "RGB · exact live default SVG preview capture",
        evidence: "Example a customer encounters in the deployed Signal Atlas customizer: the default Maya / Marfa orbital-map SVG, captured directly from the live page. Source provides a separate signed 4680×5790 print renderer, but the isolated profile had no inspectable Stripe key and no payment-linked Prodigi order was observed.",
      },
      {
        id: "terra", model: models.terra, commit: "fe285fc7", status: "Deployed · payment blocked",
        deployment: "https://benchmark-20260908-prompt-v3-rerun2-nine.vercel.app",
        finalOutput: "/suites/20260908-prompt-v3-rerun2-high/runs/20260908-prompt-v3-rerun2-high-codex-gpt-5.6-terra/final.md",
        design: "/suites/20260908-prompt-v3-rerun2-high/runs/20260908-prompt-v3-rerun2-high-codex-gpt-5.6-terra/design.png",
        width: 1158, height: 1413, alpha: "RGB · exact live default shirt preview capture",
        evidence: "Example a customer encounters in the deployed Signal Foundry builder: the default signal-card shirt preview, captured verbatim from the live tee component. The implementation claims a separate 2400×3000 print PNG, but no paid order archived that source because Stripe credentials were unavailable.",
      },
      {
        id: "luna", model: models.luna, commit: "e57e002d", status: "Deployed · payment blocked",
        deployment: "https://benchmark-20260908-prompt-v3-rerun2-ten.vercel.app",
        finalOutput: "/suites/20260908-prompt-v3-rerun2-high/runs/20260908-prompt-v3-rerun2-high-codex-gpt-5.6-luna/final.md",
        design: "/suites/20260908-prompt-v3-rerun2-high/runs/20260908-prompt-v3-rerun2-high-codex-gpt-5.6-luna/design.png",
        width: 1218, height: 1473, alpha: "RGB · exact live default shirt preview capture",
        evidence: "Example a customer encounters on the deployed Signal Bloom page: its default KEEP / GOING hero shirt, captured directly from the live preview. Fulfillment generates a separate PDF, but checkout fails closed without Stripe credentials, so this is representative storefront evidence rather than paid-order artwork.",
      },
      {
        id: "fable", model: models.fable, commit: "025de054", status: "Paid E2E · 1 completed asset · 3 asset errors",
        deployment: "https://benchmark-20260908-prompt-v3-rerun2-jet.vercel.app",
        finalOutput: "/suites/20260908-prompt-v3-rerun2-high/runs/20260908-prompt-v3-rerun2-high-claude-claude-fable-5-1/final.md",
        design: "/suites/20260908-prompt-v3-rerun2-high/runs/20260908-prompt-v3-rerun2-high-claude-claude-fable-5-1/design.png",
        width: 4665, height: 5844, alpha: "RGBA transparency · exact paid-order source",
        evidence: "Four genuine paid Stripe test Sessions linked to Prodigi orders. The selected navy-blue/L order ord_1171080 completed with this exact MD5-matched 4665×5844 star map and a fetched thumbnail; three earlier linked orders reported asset errors, so reliability needs investigation. A captured webhook credential was quarantined from public artifacts before publication.",
      },
      {
        id: "opus", model: models.opus, commit: "eb82a0e8", status: "Paid E2E · 3 completed assets",
        deployment: "https://benchmark-20260908-prompt-v3-rerun2-pi.vercel.app",
        finalOutput: "/suites/20260908-prompt-v3-rerun2-high/runs/20260908-prompt-v3-rerun2-high-claude-claude-opus-5/final.md",
        design: "/suites/20260908-prompt-v3-rerun2-high/runs/20260908-prompt-v3-rerun2-high-claude-claude-opus-5/design.png",
        width: 3120, height: 3860, alpha: "RGBA transparency · exact paid-order source",
        evidence: "Three genuine paid Stripe test Sessions linked to three Prodigi orders whose assets completed. The selected forest-green/L order ord_1171090 is an exact MD5 match for this 3120×3860 personalized sea chart. Artwork reaches the canvas edges, so clipping, scale, and color require physical samples.",
      },
      {
        id: "sonnet", model: models.sonnet, commit: "d76c3996", status: "Paid E2E · 3 completed assets · reliability warning",
        deployment: "https://benchmark-20260908-prompt-v3-rerun2-six.vercel.app",
        finalOutput: "/suites/20260908-prompt-v3-rerun2-high/runs/20260908-prompt-v3-rerun2-high-claude-claude-sonnet-5/final.md",
        design: "/suites/20260908-prompt-v3-rerun2-high/runs/20260908-prompt-v3-rerun2-high-claude-claude-sonnet-5/design.png",
        width: 1600, height: 2000, alpha: "Opaque RGBA · exact paid-order source · 72 DPI metadata",
        evidence: "Four genuine succeeded Stripe PaymentIntents were observed. Three link to Prodigi orders ord_1171111, ord_1171112, and ord_1171115; their assets completed. The selected navy-blue/XL order ord_1171112 exactly MD5-matches this 1600×2000 Skyprint source and its Prodigi thumbnail. One earlier succeeded PaymentIntent remained pending without a linked order, so webhook reliability needs investigation. A declined payment produced no order.",
      },
    ],
  },
  {
    id: "20260907-prompt-v3-rerun-high",
    label: "2026-09-07 · Prompt v3 · Queued rerun [incomplete]",
    incomplete: true,
    summary: "/suites/20260907-prompt-v3-rerun-high/summary.md",
    prompt: { path: "/suites/20260907-prompt-v3-rerun-high/prompt.md", file: "prompt-v3.md", revision: "3442b70e56ceac2d0fe20497f39d23374f04bca9", sha256: "30868370940510cfeb6f8c1da9e0f748ad6ac4f3e1e5e59e3e85adcecc910f99" },
    runs: [
      {
        id: "astra", model: models.astra, commit: "b150c3dc", status: "Deployed · payment blocked",
        deployment: "https://benchmark-20260907-prompt-v3-rerun-high-codex-gpt-6-astra.vercel.app",
        finalOutput: "/suites/20260907-prompt-v3-rerun-high/runs/20260907-prompt-v3-rerun-high-codex-gpt-6-astra/final.md",
        design: "/suites/20260907-prompt-v3-rerun-high/runs/20260907-prompt-v3-rerun-high-codex-gpt-6-astra/design.png",
        width: 600, height: 754, alpha: "RGBA transparency · live default preview route",
        evidence: "Example a customer encounters in the deployed customizer: BIG SUR / THE PARKER FAMILY, fetched from the live default artwork route. It is representative preview evidence, not a paid or Prodigi-hash-matched source. The isolated profile had no Stripe key. Generated dummy secret literals in tests were mechanically renamed for publication; the model was not rerun.",
      },
      {
        id: "sol", model: models.sol, commit: "d1481965", status: "Deployed · payment blocked",
        deployment: "https://benchmark-20260907-prompt-v3-rerun-lime.vercel.app",
        finalOutput: "/suites/20260907-prompt-v3-rerun-high/runs/20260907-prompt-v3-rerun-high-codex-gpt-5.6-sol/final.md",
        design: "/suites/20260907-prompt-v3-rerun-high/runs/20260907-prompt-v3-rerun-high-codex-gpt-5.6-sol/design.png",
        width: 1456, height: 1822, alpha: "RGB · exact live default SVG preview capture",
        evidence: "Example a customer encounters in the deployed customizer: the default Big Sur Fieldmark topographic proof, captured directly from its live SVG. Source code provides a separate signed 4680×5790 print route. Stripe was unavailable, so this is representative preview evidence rather than paid-order evidence.",
      },
      {
        id: "terra", model: models.terra, commit: "a9d0fb0e", status: "Deployed · payment blocked",
        deployment: "https://benchmark-20260907-prompt-v3-rerun-eight.vercel.app",
        finalOutput: "/suites/20260907-prompt-v3-rerun-high/runs/20260907-prompt-v3-rerun-high-codex-gpt-5.6-terra/final.md",
        design: "/suites/20260907-prompt-v3-rerun-high/runs/20260907-prompt-v3-rerun-high-codex-gpt-5.6-terra/design.png",
        width: 3307, height: 4606, alpha: "RGBA transparency · exact live default print route",
        evidence: "Exact default Avery / Los Angeles / Aquarius image from the same public 3307×4606 route shown in the customizer and supplied by checkout metadata. The route is representative customer-path evidence, not a fulfilled order: Stripe credentials were absent and no payment completed.",
      },
      {
        id: "luna", model: models.luna, commit: "93681c94", status: "Deployed · payment blocked",
        deployment: "https://benchmark-20260907-prompt-v3-rerun-zeta.vercel.app",
        finalOutput: "/suites/20260907-prompt-v3-rerun-high/runs/20260907-prompt-v3-rerun-high-codex-gpt-5.6-luna/final.md",
        design: "/suites/20260907-prompt-v3-rerun-high/runs/20260907-prompt-v3-rerun-high-codex-gpt-5.6-luna/design.png",
        width: 2400, height: 3000, alpha: "RGBA transparency · exact live default print route",
        evidence: "Exact Mara / stay curious / orbit output from the live public print route used by fulfillment. This is the image a default customer configuration can produce, and it exposes missing-glyph boxes plus extremely sparse placement. Payments were not configured, so it is not paid-order evidence.",
      },
      {
        id: "fable", model: models.fable, commit: "f6157dd8", status: "Paid E2E · 2 completed assets",
        deployment: "https://benchmark-20260907-prompt-v3-rerun-seven.vercel.app",
        finalOutput: "/suites/20260907-prompt-v3-rerun-high/runs/20260907-prompt-v3-rerun-high-claude-claude-fable-5-1/final.md",
        design: "/suites/20260907-prompt-v3-rerun-high/runs/20260907-prompt-v3-rerun-high-claude-claude-fable-5-1/design.png",
        width: 4677, height: 5881, alpha: "RGBA transparency",
        evidence: "Two genuine Stripe test Sessions reached paid and linked to Prodigi orders whose assets completed. This is the reviewed current Orrery rendering for the navy-blue/L order; a later download did not byte-match Prodigi's recorded source hash, so exact historical bytes are not claimed. Physical output remains unverified.",
      },
      {
        id: "opus", model: models.opus, commit: "872eaa03", status: "Provider limit · partial build",
        deployment: null,
        finalOutput: "/suites/20260907-prompt-v3-rerun-high/runs/20260907-prompt-v3-rerun-high-claude-claude-opus-5/final.md",
        design: null, width: null, height: null, alpha: "No reviewed artwork",
        evidence: "The provider session limit stopped the run after 6m14s. A partial Next.js/Stripe/Prodigi workspace was archived, but there is no deployment, completed checkout, or attributable fulfillment evidence.",
      },
      {
        id: "sonnet", model: models.sonnet, commit: "d725f327", status: "Provider limit · no build",
        deployment: null,
        finalOutput: "/suites/20260907-prompt-v3-rerun-high/runs/20260907-prompt-v3-rerun-high-claude-claude-sonnet-5/final.md",
        design: null, width: null, height: null, alpha: "No artwork generated",
        evidence: "The shared provider session quota was already exhausted. The adapter returned the limit message after about one second; no workspace, deployment, checkout, artwork, or fulfillment evidence was produced.",
      },
    ],
  },
  {
    id: "20260907-prompt-v3-high",
    label: "2026-09-07 · Prompt v3 · Original",
    summary: "/suites/20260907-prompt-v3-high/summary.md",
    prompt: { path: "/suites/20260907-prompt-v3-high/prompt.md", file: "prompt-v3.md", revision: "3442b70e56ceac2d0fe20497f39d23374f04bca9", sha256: "30868370940510cfeb6f8c1da9e0f748ad6ac4f3e1e5e59e3e85adcecc910f99" },
    runs: [
      {
        id: "astra", model: models.astra, commit: "0e390453", status: "Deployed · payment blocked",
        deployment: "https://benchmark-20260907-prompt-v3-high-codex-gpt-6-astra.vercel.app",
        finalOutput: "/suites/20260907-prompt-v3-high/runs/20260907-prompt-v3-high-codex-gpt-6-astra/final.md",
        design: "/suites/20260907-prompt-v3-high/runs/20260907-prompt-v3-high-codex-gpt-6-astra/design.png",
        width: 540, height: 586, alpha: "RGB · exact live default preview capture",
        evidence: "Example a customer encounters in the deployed customizer: its default Joshua Tree Personal Orbit artwork, captured from the live preview endpoint. Automated tests cover the separate high-resolution print path, but no paid order exists because the isolated Stripe profile had no key. Synthetic fixture literals were mechanically renamed for publication.",
      },
      {
        id: "sol", model: models.sol, commit: "256e4554", status: "Deployed · payment blocked",
        deployment: "https://benchmark-20260907-prompt-v3-high-c-one.vercel.app",
        finalOutput: "/suites/20260907-prompt-v3-high/runs/20260907-prompt-v3-high-codex-gpt-5.6-sol/final.md",
        design: "/suites/20260907-prompt-v3-high/runs/20260907-prompt-v3-high-codex-gpt-5.6-sol/design.png",
        width: 1036, height: 1274, alpha: "RGB · exact live default SVG preview capture",
        evidence: "Example a customer encounters in the deployed customizer: the default Joshua Tree orbital artwork, captured directly from its live SVG. The implementation has a distinct signed 4677×5787 print renderer. With no Stripe key, this preview is not evidence of a paid or fulfilled order.",
      },
      {
        id: "terra", model: models.terra, commit: "9cc70030", status: "Deployed · payment blocked",
        deployment: "https://benchmark-20260907-prompt-v3-high-c-five.vercel.app",
        finalOutput: "/suites/20260907-prompt-v3-high/runs/20260907-prompt-v3-high-codex-gpt-5.6-terra/final.md",
        design: "/suites/20260907-prompt-v3-high/runs/20260907-prompt-v3-high-codex-gpt-5.6-terra/design.png",
        width: 782, height: 952, alpha: "RGB · exact live default shirt preview capture",
        evidence: "Example a customer encounters in the deployed builder: Mara's default 05:17 Club shirt preview, captured verbatim from the live tee component. A signed 2490×3510 print route exists but requires an order token. Stripe was unconfigured, so this mockup is representative rather than fulfillment evidence.",
      },
      {
        id: "luna", model: models.luna, commit: "4c438a63", status: "Deployed · payment blocked",
        deployment: "https://benchmark-20260907-prompt-v3-high-c-mauve.vercel.app",
        finalOutput: "/suites/20260907-prompt-v3-high/runs/20260907-prompt-v3-high-codex-gpt-5.6-luna/final.md",
        design: "/suites/20260907-prompt-v3-high/runs/20260907-prompt-v3-high-codex-gpt-5.6-luna/design.png",
        width: 472, height: 370, alpha: "RGB · exact live default SVG preview capture",
        evidence: "Example a customer encounters in the deployed customizer: the default KEEP / GOING signal map, captured directly from its live SVG. It is preview evidence only; missing isolated Stripe credentials prevented checkout and no payment-linked Prodigi asset was available.",
      },
      {
        id: "fable", model: models.fable, commit: "5e0b9157", status: "Deployed · payment blocked",
        deployment: "https://benchmark-20260907-prompt-v3-high-c-nine.vercel.app",
        finalOutput: "/suites/20260907-prompt-v3-high/runs/20260907-prompt-v3-high-claude-claude-fable-5-1/final.md",
        design: "/suites/20260907-prompt-v3-high/runs/20260907-prompt-v3-high-claude-claude-fable-5-1/design.png",
        width: 832, height: 1030, alpha: "RGB · exact live default SVG preview capture",
        evidence: "Example a customer encounters on the deployed Bloomprint page: its default Amelia alpina botanical plate, captured directly from the live SVG. A separate direct sandbox asset check completed, but the empty Stripe profile prevented paid checkout. Synthetic fixture secrets were mechanically renamed for publication without rerunning the model.",
      },
      {
        id: "opus", model: models.opus, commit: "9c84af29", status: "Paid E2E · 2 completed assets",
        deployment: "https://benchmark-20260907-prompt-v3-high-c-pearl.vercel.app",
        finalOutput: "/suites/20260907-prompt-v3-high/runs/20260907-prompt-v3-high-claude-claude-opus-5/final.md",
        design: "/suites/20260907-prompt-v3-high/runs/20260907-prompt-v3-high-claude-claude-opus-5/design.png",
        width: 4680, height: 5790, alpha: "RGBA transparency · light ink for black shirt",
        evidence: "Two genuine $48 Stripe test Sessions reached paid and linked to distinct Prodigi sandbox orders. The selected black/XL Cryptidæ source is an exact MD5 match for order ord_1171012 and asset preparation completed. The design is high resolution; physical placement and color still need samples.",
      },
      {
        id: "sonnet", model: models.sonnet, commit: "75697169", status: "Paid E2E · front + back assets complete",
        deployment: "https://benchmark-20260907-prompt-v3-high-c-chi.vercel.app",
        finalOutput: "/suites/20260907-prompt-v3-high/runs/20260907-prompt-v3-high-claude-claude-sonnet-5/final.md",
        design: "/suites/20260907-prompt-v3-high/runs/20260907-prompt-v3-high-claude-claude-sonnet-5/design.png",
        width: 3000, height: 3750, alpha: "RGBA transparency · full-canvas circuit design",
        evidence: "A genuine paid Stripe test Session linked to Prodigi order ord_1171015. The selected black/XL front source is an exact MD5 match; both front and back asset downloads completed. The 3000×3750 generative circuit reaches canvas edges, so physical scale and clipping need a sample.",
      },
    ],
  },
  {
    id: "20260907-prompt-v2-rerun2-high",
    label: "2026-09-07 · Prompt v2 · Second rerun",
    summary: "/suites/20260907-prompt-v2-rerun2-high/summary.md",
    prompt: { path: "/suites/20260907-prompt-v2-rerun2-high/prompt.md", file: "prompt-v2.md", revision: "01bb32d2b9201a1caf0eee56f755259c6f1ce183", sha256: "9b6228722b8330ca6d1311de695eb99ec4da2809a92e17be2e7c82a0e13f316b" },
    runs: [
      {
        id: "astra", model: models.astra, commit: "bd649736", status: "Sandbox checkout · completed print",
        deployment: "https://amateur-weather-club-20260907-r2-astra-7f4c.vercel.app",
        finalOutput: "/suites/20260907-prompt-v2-rerun2-high/runs/20260907-prompt-v2-rerun2-high-codex-gpt-6-astra/final.md",
        design: "/suites/20260907-prompt-v2-rerun2-high/runs/20260907-prompt-v2-rerun2-high-codex-gpt-6-astra/submitted.png",
        width: 1024, height: 1536, alpha: "RGBA transparency",
        evidence: "Exact navy/XL source from direct sandbox order ord_1170933; its MD5 matches Prodigi and asset preparation completed. The storefront has no payment provider. The artwork is coherent but needs a higher-resolution master and a physical sample.",
      },
      {
        id: "sol", model: models.sol, commit: "f404c767", status: "Sandbox checkout · completed print",
        deployment: "https://benchmark-20260907-prompt-v2-rerun2-rho.vercel.app",
        finalOutput: "/suites/20260907-prompt-v2-rerun2-high/runs/20260907-prompt-v2-rerun2-high-codex-gpt-5.6-sol/final.md",
        design: "/suites/20260907-prompt-v2-rerun2-high/runs/20260907-prompt-v2-rerun2-high-codex-gpt-5.6-sol/submitted.png",
        width: 1024, height: 1536, alpha: "RGBA transparency",
        evidence: "Exact vintage-white/L Cloud Library source from direct sandbox order ord_1170943; its MD5 matches Prodigi and the order completed. No payment is collected. The agent itself recommends replacing this 1024×1536 image with a 3307×4606 print master.",
      },
      {
        id: "terra", model: models.terra, commit: "7a1675e6", status: "Sandbox checkout · completed print",
        deployment: "https://benchmark-20260907-prompt-v2-rerun2-one.vercel.app",
        finalOutput: "/suites/20260907-prompt-v2-rerun2-high/runs/20260907-prompt-v2-rerun2-high-codex-gpt-5.6-terra/final.md",
        design: "/suites/20260907-prompt-v2-rerun2-high/runs/20260907-prompt-v2-rerun2-high-codex-gpt-5.6-terra/design.png",
        width: 1024, height: 1536, alpha: "RGBA transparency",
        evidence: "The committed Night Shift Field Club source has the same MD5 as completed direct sandbox orders ord_1170945 and ord_1170946. The customer path collects no payment. The detailed design is web-resolution and needs a higher-resolution master.",
      },
      {
        id: "luna", model: models.luna, commit: "7f1a3335", status: "Sandbox checkout · submitted shirt mockup",
        deployment: "https://benchmark-20260907-prompt-v2-rerun2-plum.vercel.app",
        finalOutput: "/suites/20260907-prompt-v2-rerun2-high/runs/20260907-prompt-v2-rerun2-high-codex-gpt-5.6-luna/final.md",
        design: "/suites/20260907-prompt-v2-rerun2-high/runs/20260907-prompt-v2-rerun2-high-codex-gpt-5.6-luna/submitted.png",
        width: 1254, height: 1254, alpha: "RGB · opaque product mockup",
        evidence: "Exact black/M source from direct sandbox order ord_1170950; its MD5 matches Prodigi. The customer path submits a complete black-shirt mockup on a decorative background as the front print source, rather than isolated print artwork. No payment is collected.",
      },
      {
        id: "fable", model: models.fable, commit: "bdd9fc00", status: "Paid E2E · 2 completed prints",
        deployment: "https://benchmark-20260907-prompt-v2-rerun2-eta.vercel.app",
        finalOutput: "/suites/20260907-prompt-v2-rerun2-high/runs/20260907-prompt-v2-rerun2-high-claude-claude-fable-5-1/final.md",
        design: "/suites/20260907-prompt-v2-rerun2-high/runs/20260907-prompt-v2-rerun2-high-claude-claude-fable-5-1/design.png",
        width: 4680, height: 5790, alpha: "RGBA transparency · dark ink for light shirt",
        evidence: "Two genuine $42.95 Stripe test Checkout Sessions reached paid and linked to completed Prodigi orders. The selected white/L order ord_1170954 has an exact 4680×5790 source hash match. The enabled webhook targets this deployment; no physical sample was inspected.",
      },
      {
        id: "opus", model: models.opus, commit: "d5d700e5", status: "Direct smoke order · completed print",
        deployment: "https://benchmark-20260907-prompt-v2-rerun2-gamma.vercel.app",
        finalOutput: "/suites/20260907-prompt-v2-rerun2-high/runs/20260907-prompt-v2-rerun2-high-claude-claude-opus-5/final.md",
        design: "/suites/20260907-prompt-v2-rerun2-high/runs/20260907-prompt-v2-rerun2-high-claude-claude-opus-5/submitted.png",
        width: 3600, height: 4680, alpha: "RGBA transparency · 300 DPI metadata",
        evidence: "Exact charcoal/XL St. Junia source from direct sandbox order ord_1170971; its MD5 matches Prodigi and the order completed. The 3600×4680 file is the strongest prepared print master in the suite. A Stripe path exists but had no configured key or paid execution.",
      },
      {
        id: "sonnet", model: models.sonnet, commit: "4d6dfb0e", status: "Direct smoke order · asset fetched",
        deployment: "https://benchmark-20260907-prompt-v2-rerun2-seven.vercel.app",
        finalOutput: "/suites/20260907-prompt-v2-rerun2-high/runs/20260907-prompt-v2-rerun2-high-claude-claude-sonnet-5/final.md",
        design: "/suites/20260907-prompt-v2-rerun2-high/runs/20260907-prompt-v2-rerun2-high-claude-claude-sonnet-5/submitted.png",
        width: 2000, height: 2505, alpha: "RGBA transparency",
        evidence: "Exact navy/XL Yeti source from direct sandbox order ord_1170976; its MD5 matches Prodigi. The asset downloaded successfully but print-ready preparation had not completed at snapshot time. The storefront collects no payment; scale and low-contrast details need sample testing.",
      },
    ],
  },
  {
    id: "20260907-prompt-v2-rerun-high",
    label: "2026-09-07 · Prompt v2 · First rerun [incomplete]",
    incomplete: true,
    summary: "/suites/20260907-prompt-v2-rerun-high/summary.md",
    prompt: { path: "/suites/20260907-prompt-v2-rerun-high/prompt.md", file: "prompt-v2.md", revision: "01bb32d2b9201a1caf0eee56f755259c6f1ce183", sha256: "9b6228722b8330ca6d1311de695eb99ec4da2809a92e17be2e7c82a0e13f316b" },
    runs: [
      {
        id: "astra", model: models.astra, commit: "b697f342", status: "Sandbox checkout · completed print",
        deployment: "https://benchmark-20260907-prompt-v2-rerun-high-codex-gpt-6-astra.vercel.app",
        finalOutput: "/suites/20260907-prompt-v2-rerun-high/runs/20260907-prompt-v2-rerun-high-codex-gpt-6-astra/final.md",
        design: "/suites/20260907-prompt-v2-rerun-high/runs/20260907-prompt-v2-rerun-high-codex-gpt-6-astra/design.png",
        width: 1122, height: 1402, alpha: "RGB · opaque cream panel",
        evidence: "Exact customer-path Natural/M source from direct sandbox order ord_1170913; MD5 matches Prodigi and asset preparation completed. The app simulates payment instead of collecting it. The 1122×1402 raster needs physical-size review before sale.",
      },
      {
        id: "sol", model: models.sol, commit: "5d20510b", status: "Sandbox checkout · completed print",
        deployment: "https://benchmark-20260907-prompt-v2-rerun-five.vercel.app",
        finalOutput: "/suites/20260907-prompt-v2-rerun-high/runs/20260907-prompt-v2-rerun-high-codex-gpt-5.6-sol/final.md",
        design: "/suites/20260907-prompt-v2-rerun-high/runs/20260907-prompt-v2-rerun-high-codex-gpt-5.6-sol/design.png",
        width: 1024, height: 1536, alpha: "RGBA transparency",
        evidence: "Exact customer-path black/M luna-moth source from direct sandbox order ord_1170918; MD5 matches Prodigi and the order completed. No payment is collected. The 1024×1536 source and physical placement require sample validation.",
      },
      {
        id: "terra", model: models.terra, commit: "23a1ad2f", status: "Sandbox checkout · completed print",
        deployment: "https://benchmark-20260907-prompt-v2-rerun-mu.vercel.app",
        finalOutput: "/suites/20260907-prompt-v2-rerun-high/runs/20260907-prompt-v2-rerun-high-codex-gpt-5.6-terra/final.md",
        design: "/suites/20260907-prompt-v2-rerun-high/runs/20260907-prompt-v2-rerun-high-codex-gpt-5.6-terra/design.png",
        width: 4680, height: 5848, alpha: "RGBA transparency",
        evidence: "Committed Night Shift Atlas source is byte-identical to the asset Prodigi fetched for direct sandbox order ord_1170920 (MD5 291866…); black/M, Bella + Canvas 3001, fillPrintArea. No payment is collected; physical sample unverified.",
      },
      {
        id: "luna", model: models.luna, commit: "2c0f6f29", status: "Sandbox checkout · submitted shirt mockup",
        deployment: "https://benchmark-20260907-prompt-v2-rerun-lemon.vercel.app",
        finalOutput: "/suites/20260907-prompt-v2-rerun-high/runs/20260907-prompt-v2-rerun-high-codex-gpt-5.6-luna/final.md",
        design: "/suites/20260907-prompt-v2-rerun-high/runs/20260907-prompt-v2-rerun-high-codex-gpt-5.6-luna/design.png",
        width: 1254, height: 1254, alpha: "RGB · opaque product mockup",
        evidence: "Exact committed Waypoint image is byte-identical to Prodigi order ord_1170923 (MD5 a7e7a9…). The customer path submits a complete cream-shirt mockup as the front print source, not isolated print artwork. The sandbox order completed, but there is no payment.",
      },
      {
        id: "fable", model: models.fable, commit: "c1989096", status: "Provider limit · partial build",
        deployment: null,
        finalOutput: "/suites/20260907-prompt-v2-rerun-high/runs/20260907-prompt-v2-rerun-high-claude-claude-fable-5-1/final.md",
        design: "/suites/20260907-prompt-v2-rerun-high/runs/20260907-prompt-v2-rerun-high-claude-claude-fable-5-1/design.png",
        width: 4665, height: 5844, alpha: "RGBA transparency · partial-build asset",
        evidence: "The session limit stopped the run before deployment after 15m19s. The archived workspace contains a substantial Next.js/Stripe/Prodigi implementation and eight print files; this reviewed local Dial-up Canyon asset was never tied to a run-specific deployed customer order.",
      },
      {
        id: "opus", model: models.opus, commit: "ff816451", status: "Provider limit · no build",
        deployment: null,
        finalOutput: "/suites/20260907-prompt-v2-rerun-high/runs/20260907-prompt-v2-rerun-high-claude-claude-opus-5/final.md",
        design: null, width: null, height: null, alpha: "No artwork generated",
        evidence: "The shared Claude session quota was already exhausted. The adapter returned the provider-limit message after about one second; no workspace, technology choice, deployment, or source-use history was produced.",
      },
      {
        id: "sonnet", model: models.sonnet, commit: "ca0d28f8", status: "Provider limit · no build",
        deployment: null,
        finalOutput: "/suites/20260907-prompt-v2-rerun-high/runs/20260907-prompt-v2-rerun-high-claude-claude-sonnet-5/final.md",
        design: null, width: null, height: null, alpha: "No artwork generated",
        evidence: "The shared Claude session quota was already exhausted. The adapter returned the provider-limit message after about one second; no workspace, technology choice, deployment, or source-use history was produced.",
      },
    ],
  },
  {
    "id": "20260906-minimal-inspector-high",
    "label": "2026-09-06 · Minimal prompt · Inspector",
    "summary": "/suites/20260906-minimal-inspector-high/summary.md",
    "prompt": {
      "path": "/suites/20260906-minimal-inspector-high/prompt.md",
      "file": "prompt-minimal.md",
      "revision": "4bc4cd4b59f6f5bbab4b9df6a26f480d02c0b40d",
      "sha256": "89e64ebec54ddb8a435fa862928543f5c8a9ef64f34f79acfd80bc87e515b390"
    },
    "runs": [
      {
        "id": "astra",
        "model": "Codex · gpt-6-astra",
        "commit": "b38cde9f",
        "status": "Direct smoke order · isolation failure",
        "deployment": "https://datetime-20260906-6b537472.vercel.app",
        "finalOutput": "/suites/20260906-minimal-inspector-high/runs/20260906-minimal-inspector-high-codex-gpt-6-astra/final.md",
        "design": "/suites/20260906-minimal-inspector-high/runs/20260906-minimal-inspector-high-codex-gpt-6-astra/design.png",
        "width": 4677,
        "height": 5881,
        "alpha": "RGBA transparency · white ink for black shirt",
        "evidence": "Exact unisex/M test-order source using an unpaid Astra app Session's timestamp input. The raster cuts off the final digits; this is present in the original, not viewer cropping. Standalone paid PaymentIntent and smoke orders do not prove hosted checkout. Astra's Stripe account also contains Terra's webhook; isolation failed. ord_1170757; original MD5 matches Prodigi. GLOBAL-TEE-BC-3001, black/m, front, fitPrintArea. Canvas 4677×5881; 146,180 nontransparent pixels; bounds (1153, 931, 3268, 1154). Full canvas preserved; physical placement/sample unverified."
      },
      {
        "id": "sol",
        "model": "Codex · gpt-5.6-sol",
        "commit": "bf3486fc",
        "status": "Direct smoke order · ineffective print scale",
        "deployment": "https://benchmark-20260906-minimal-inspecto-inky.vercel.app",
        "finalOutput": "/suites/20260906-minimal-inspector-high/runs/20260906-minimal-inspector-high-codex-gpt-5.6-sol/final.md",
        "design": "/suites/20260906-minimal-inspector-high/runs/20260906-minimal-inspector-high-codex-gpt-5.6-sol/design.png",
        "width": 4665,
        "height": 5844,
        "alpha": "RGBA transparency · white ink for black shirt",
        "evidence": "Exact fitted/M standalone test-order source using the app's signed artwork route, not a paid customer order. The 13-digit timestamp has only 754 nontransparent pixels and a 129×12-pixel bounding box. Both app Sessions remain unpaid; fit/size inputs differ from the same-timestamp unisex/L Session, but renderer draws only the timestamp. ord_1170762; original MD5 matches Prodigi. GLOBAL-TEE-BC-6004, black/m, front, fitPrintArea. Canvas 4665×5844; 754 nontransparent pixels; bounds (2268, 1412, 2397, 1424). Full canvas preserved; physical placement/sample unverified."
      },
      {
        "id": "terra",
        "model": "Codex · gpt-5.6-terra",
        "commit": "b0477cd5",
        "status": "Direct smoke order · isolation failure",
        "deployment": "https://benchmark-20260906-minimal-inspecto-plum.vercel.app",
        "finalOutput": "/suites/20260906-minimal-inspector-high/runs/20260906-minimal-inspector-high-codex-gpt-5.6-terra/final.md",
        "design": "/suites/20260906-minimal-inspector-high/runs/20260906-minimal-inspector-high-codex-gpt-5.6-terra/design.png",
        "width": 2480,
        "height": 3507,
        "alpha": "RGBA transparency · white ink for black shirt",
        "evidence": "Exact fitted/M test source, timestamp 1777777777777. Standalone Prodigi submission, not customer checkout proof. Terra's saved Stripe profile has no test key; its storefront webhook appears on Astra's account. Source reads current collected_information first, with a legacy fallback. ord_1170764; original MD5 matches Prodigi. GLOBAL-TEE-GIL-64000L, black/m, front, fillPrintArea. Canvas 2480×3507; 39,646 nontransparent pixels; bounds (695, 1696, 1805, 1821). Full canvas preserved; physical placement/sample unverified."
      },
      {
        "id": "luna",
        "model": "Codex · gpt-5.6-luna",
        "commit": "94cf62bd",
        "status": "Payment received · extra branding",
        "deployment": "https://benchmark-20260906-minimal-inspecto-orpin.vercel.app",
        "finalOutput": "/suites/20260906-minimal-inspector-high/runs/20260906-minimal-inspector-high-codex-gpt-5.6-luna/final.md",
        "design": "/suites/20260906-minimal-inspector-high/runs/20260906-minimal-inspector-high-codex-gpt-5.6-luna/design.png",
        "width": 4677,
        "height": 5787,
        "alpha": "RGBA transparency · white ink for black shirt",
        "evidence": "Exact paid fitted/L source. The deployed PNG has only 4,636 nontransparent pixels and includes ISO date, fit, and DATETIME.STORE in addition to the timestamp. Paid app-shaped PaymentIntent links to completed order; independent browser replay remains unverified. ord_1170769; original MD5 matches Prodigi. GLOBAL-TEE-BC-6004, black/l, front, fitPrintArea. Canvas 4677×5787; 4,636 nontransparent pixels; bounds (2014, 2807, 2668, 3459). Full canvas preserved; physical placement/sample unverified."
      },
      {
        "id": "fable",
        "model": "Claude · claude-fable-5-1",
        "commit": "aaae4f46",
        "status": "Paid E2E · completed print",
        "deployment": "https://benchmark-20260906-minimal-inspecto-five.vercel.app",
        "finalOutput": "/suites/20260906-minimal-inspector-high/runs/20260906-minimal-inspector-high-claude-claude-fable-5-1/final.md",
        "design": "/suites/20260906-minimal-inspector-high/runs/20260906-minimal-inspector-high-claude-claude-fable-5-1/design.png",
        "width": 2490,
        "height": 3510,
        "alpha": "RGBA transparency · white ink for black shirt",
        "evidence": "Exact paid unisex/L source. App PaymentIntent receipt, selected variant, and completed Prodigi order agree. Archived browser purchase script and final report support the customer flow; audit did not replay payment. Earlier asset failures remain in the record. ord_1170778; original MD5 matches Prodigi. GLOBAL-TEE-BC-3001, black/l, front, fitPrintArea. Canvas 2490×3510; 88,621 nontransparent pixels; bounds (371, 654, 2118, 806). Full canvas preserved; physical placement/sample unverified."
      },
      {
        "id": "opus",
        "model": "Claude · claude-opus-5",
        "commit": "f13ab70f",
        "status": "Paid E2E · completed print",
        "deployment": "https://benchmark-20260906-minimal-inspecto-mu.vercel.app",
        "finalOutput": "/suites/20260906-minimal-inspector-high/runs/20260906-minimal-inspector-high-claude-claude-opus-5/final.md",
        "design": "/suites/20260906-minimal-inspector-high/runs/20260906-minimal-inspector-high-claude-claude-opus-5/design.png",
        "width": 4680,
        "height": 5790,
        "alpha": "RGBA transparency · white ink for black shirt",
        "evidence": "Exact paid fitted/M source. Final app payment links to completed Prodigi order with the intended garment. Body idempotency, manual capture and failure cancellation are implemented; earlier failed-asset tests are not silently discarded. ord_1170792; original MD5 matches Prodigi. GLOBAL-TEE-BC-6004, black/m, front, fitPrintArea. Canvas 4680×5790; 246,242 nontransparent pixels; bounds (1147, 895, 3542, 1117). Full canvas preserved; physical placement/sample unverified."
      },
      {
        "id": "sonnet",
        "model": "Claude · claude-sonnet-5",
        "commit": "f872593d",
        "status": "Payment received · duplicate-order risk",
        "deployment": "https://benchmark-20260906-minimal-inspecto-flax.vercel.app",
        "finalOutput": "/suites/20260906-minimal-inspector-high/runs/20260906-minimal-inspector-high-claude-claude-sonnet-5/final.md",
        "design": "/suites/20260906-minimal-inspector-high/runs/20260906-minimal-inspector-high-claude-claude-sonnet-5/design.png",
        "width": 1500,
        "height": 1800,
        "alpha": "RGBA transparency · white ink for black shirt",
        "evidence": "Exact paid fitted/M source includes a date subtitle, failing timestamp-only scoring. Two earlier PaymentIntents each produced duplicate orders. Final code uses a non-atomic metadata claim without Prodigi idempotencyKey; Gildan 64000 is the chosen Softstyle 'fitted' mapping, not a women's fitted SKU. ord_1170804; original MD5 matches Prodigi. GLOBAL-TEE-GIL-64000, black/m, front, fitPrintArea. Canvas 1500×1800; 77,376 nontransparent pixels; bounds (87, 777, 1386, 1062). Full canvas preserved; physical placement/sample unverified."
      }
    ]
  },
  {
    id: "20260907-prompt-v2-high",
    label: "2026-09-07 · Prompt v2 · Original [incomplete]",
    incomplete: true,
    summary: "/suites/20260907-prompt-v2-high/summary.md",
    prompt: { path: "/suites/20260907-prompt-v2-high/prompt.md", file: "prompt-v2.md", revision: "01bb32d2b9201a1caf0eee56f755259c6f1ce183", sha256: "9b6228722b8330ca6d1311de695eb99ec4da2809a92e17be2e7c82a0e13f316b" },
    runs: [
      { id: "astra", model: models.astra, commit: "37983374", status: "Prodigi sandbox · no payment", deployment: "https://benchmark-20260907-prompt-v2-high-c.vercel.app", finalOutput: "/suites/20260907-prompt-v2-high/runs/20260907-prompt-v2-high-codex-gpt-6-astra/final.md", design: "/suites/20260907-prompt-v2-high/runs/20260907-prompt-v2-high-codex-gpt-6-astra/design.png", width: 1122, height: 1402, alpha: "RGB · representative committed print asset", evidence: "Out of Office Club. Direct sandbox order verified; no payment collection. Representative committed catalog art; physical print quality unverified." },
      { id: "sol", model: models.sol, commit: "a35eaf9b", status: "Prodigi sandbox · no payment", deployment: "https://benchmark-20260907-prompt-v2-high-c-gold.vercel.app", finalOutput: "/suites/20260907-prompt-v2-high/runs/20260907-prompt-v2-high-codex-gpt-5.6-sol/final.md", design: "/suites/20260907-prompt-v2-high/runs/20260907-prompt-v2-high-codex-gpt-5.6-sol/design.png", width: 2490, height: 3510, alpha: "Indexed PNG · representative committed print asset", evidence: "Afterglow Supply Co. Direct sandbox order verified; no payment collection. Night Signal catalog print selected; physical sample unverified." },
      { id: "terra", model: models.terra, commit: "ea88338a", status: "Prodigi sandbox · no payment", deployment: "https://benchmark-20260907-prompt-v2-high-c-psi.vercel.app", finalOutput: "/suites/20260907-prompt-v2-high/runs/20260907-prompt-v2-high-codex-gpt-5.6-terra/final.md", design: "/suites/20260907-prompt-v2-high/runs/20260907-prompt-v2-high-codex-gpt-5.6-terra/design.png", width: 2490, height: 3510, alpha: "RGBA · representative committed print asset", evidence: "Night Hike Club. Direct sandbox order verified; no payment collection. Moth Signal print selected; physical sample unverified." },
      { id: "luna", model: models.luna, commit: "fc154f3a", status: "Prodigi sandbox · no payment", deployment: "https://benchmark-20260907-prompt-v2-high-codex-gpt-56-luna-lvfynlvgr.vercel.app", finalOutput: "/suites/20260907-prompt-v2-high/runs/20260907-prompt-v2-high-codex-gpt-5.6-luna/final.md", design: "/suites/20260907-prompt-v2-high/runs/20260907-prompt-v2-high-codex-gpt-5.6-luna/design.svg", width: 600, height: 700, alpha: "SVG · representative committed artwork", evidence: "Moonmoth Supply Co. Direct sandbox order verified; no payment collection. SVG catalog artwork selected; raster print readiness and physical sample unverified." },
      { id: "fable", model: models.fable, commit: "34f756ce", status: "Prodigi sandbox · no payment", deployment: "https://benchmark-20260907-prompt-v2-high-c-nine.vercel.app", finalOutput: "/suites/20260907-prompt-v2-high/runs/20260907-prompt-v2-high-claude-claude-fable-5-1/final.md", design: "/suites/20260907-prompt-v2-high/runs/20260907-prompt-v2-high-claude-claude-fable-5-1/design.png", width: 4500, height: 5400, alpha: "RGBA · dark-garment print asset", evidence: "The Obsolete Guild. Direct sandbox orders and asset download reported; no payment collection. Lamplighter dark-garment print selected; sample unverified." },
      { id: "opus", model: models.opus, commit: "92e24cd5", status: "8 paid sessions · 8 linked orders", deployment: "https://benchmark-20260907-prompt-v2-high-c-nu.vercel.app", finalOutput: "/suites/20260907-prompt-v2-high/runs/20260907-prompt-v2-high-claude-claude-opus-5/final.md", design: "/suites/20260907-prompt-v2-high/runs/20260907-prompt-v2-high-claude-claude-opus-5/design.png", width: 4665, height: 5844, alpha: "RGBA · dark-garment print asset", evidence: "Last Shift. Inspector observed eight paid Stripe sessions and eight linked Prodigi orders. Lamplighter dark print selected; concurrency/reconciliation logic and physical sample still require review." },
      { id: "sonnet", model: models.sonnet, commit: "e09d0cf0", status: "Prodigi sandbox · no payment", deployment: "https://benchmark-20260907-prompt-v2-high-c-eight.vercel.app", finalOutput: "/suites/20260907-prompt-v2-high/runs/20260907-prompt-v2-high-claude-claude-sonnet-5/final.md", design: "/suites/20260907-prompt-v2-high/runs/20260907-prompt-v2-high-claude-claude-sonnet-5/design.png", width: 3600, height: 3600, alpha: "RGBA · representative committed print asset", evidence: "Night Shift Cryptids. Direct sandbox orders and asset validation reported; no payment collection. Mothman print selected; physical sample unverified." },
    ],
  },
  {
    id: "20260906-clean-sheet-high",
    label: "2026-09-06 · Clean-sheet prompt",
    summary: "/suites/20260906-clean-sheet-high/summary.md",
    prompt: { path: "/suites/20260906-clean-sheet-high/prompt.md", file: "prompt-clean-sheet.md", revision: "c6fd043cebfe80bedf4aa58ce998b4cedfe4a987", sha256: "8342bfa546623e9fd09dc35be2cc757f574900fc0bb370178dc7675266182206" },
    runs: [
      {
        id: "astra", model: models.astra, commit: "d67a9f00", status: "Paid E2E · asset fetched",
        deployment: "https://benchmark-20260906-clean-sheet-high-codex-gpt-6-astra.vercel.app",
        finalOutput: "/suites/20260906-clean-sheet-high/runs/20260906-clean-sheet-high-codex-gpt-6-astra/final.md", design: "/suites/20260906-clean-sheet-high/runs/20260906-clean-sheet-high-codex-gpt-6-astra/design.png",
        width: 4677, height: 5881, alpha: "RGBA transparency",
        evidence: "Exact paid orbit/M source from ord_1170685; MD5 matches Prodigi. 956,727 nontransparent pixels; bounds (906,407)–(3771,5129). Black Gildan 64000, front, fitPrintArea. The same paid cart includes phase/S ×2; its v2 source was also hash-verified. API-driven confirmation used the original app Session with shipping, not a cloned fixture. Physical samples remain unverified.",
      },
      {
        id: "sol", model: models.sol, commit: "14d4ed07", status: "Hosted unpaid · theme design",
        deployment: "https://benchmark-20260906-clean-sheet-high-lovat.vercel.app",
        finalOutput: "/suites/20260906-clean-sheet-high/runs/20260906-clean-sheet-high-codex-gpt-5.6-sol/final.md", design: "/suites/20260906-clean-sheet-high/runs/20260906-clean-sheet-high-codex-gpt-5.6-sol/design.png",
        width: 6000, height: 7200, alpha: "RGBA transparency · dark ink for orange shirt",
        evidence: "Exact hosted /prints/418-teapot.png selected by the unpaid orange/XL Session. 2,151,132 nontransparent pixels; bounds (493,2340)–(5504,4321). Expected app mapping: Gildan 5000, front, fitPrintArea. Dark lettering is intended for the orange garment; choose a light/orange viewer background to inspect it. No paid app order or confirmed Prodigi delivery.",
      },
      {
        id: "terra", model: models.terra, commit: "41ad2a8c", status: "Hosted unpaid · opaque panel",
        deployment: "https://benchmark-20260906-clean-sheet-high-two.vercel.app",
        finalOutput: "/suites/20260906-clean-sheet-high/runs/20260906-clean-sheet-high-codex-gpt-5.6-terra/final.md", design: "/suites/20260906-clean-sheet-high/runs/20260906-clean-sheet-high-codex-gpt-5.6-terra/design.png",
        width: 2490, height: 3510, alpha: "RGBA, but every pixel opaque",
        evidence: "Actual /trail-marker-print.png for the unpaid charcoal/M Session. All 8,739,900 pixels opaque; full-canvas bounds. This is an intentional dark topographic panel, allowed by the clean-sheet theme prompt. Expected mapping: TEE-AA-1301, front, fitPrintArea. Catalog confirms charcoal/forest/cream; app payment and delivery remain unverified.",
      },
      {
        id: "luna", model: models.luna, commit: "90e9f6e4", status: "Hosted unpaid · fulfillment concerns",
        deployment: "https://benchmark-20260906-clean-sheet-high-teal.vercel.app",
        finalOutput: "/suites/20260906-clean-sheet-high/runs/20260906-clean-sheet-high-codex-gpt-5.6-luna/final.md", design: "/suites/20260906-clean-sheet-high/runs/20260906-clean-sheet-high-codex-gpt-5.6-luna/design.png",
        width: 2172, height: 724, alpha: "RGBA transparency · fixed-edition artwork",
        evidence: "Actual static customer-path PNG for the unpaid black/M Session; fixed edition 2026-09-06 23:41, not purchase time. 165,665 nontransparent pixels; bounds (33,104)–(2011,463). Bytes match synthetic order ord_1170700, which is not paid checkout proof. TEE-GIL-64000, front, fitPrintArea; navy blue is offered but absent from this exact SKU's catalog. Handler reads legacy shipping_details. Lower print resolution and physical size require sample validation.",
      },
      {
        id: "fable", model: models.fable, commit: "c7173019", status: "Paid E2E · completed print",
        deployment: "https://benchmark-20260906-clean-sheet-high-fawn.vercel.app",
        finalOutput: "/suites/20260906-clean-sheet-high/runs/20260906-clean-sheet-high-claude-claude-fable-5-1/final.md", design: "/suites/20260906-clean-sheet-high/runs/20260906-clean-sheet-high-claude-claude-fable-5-1/design.png",
        width: 4665, height: 5844, alpha: "RGBA transparency · white ink for navy shirt",
        evidence: "Exact 418 response design from paid navy blue/XL order ord_1170711; MD5 matches Prodigi. 499,502 nontransparent pixels; bounds (320,1029)–(4334,2966). Gildan 64000, front, fillPrintArea. Stripe receipt and merchant reference agree; Prodigi reports Complete. White-on-white thumbnail is inconclusive without the original viewed against a dark background. Browser card-entry gestures were not independently replayed.",
      },
      {
        id: "opus", model: models.opus, commit: "6b779482", status: "Paid E2E · duplicate-order risk",
        deployment: "https://benchmark-20260906-clean-sheet-high-rosy.vercel.app",
        finalOutput: "/suites/20260906-clean-sheet-high/runs/20260906-clean-sheet-high-claude-claude-opus-5/final.md", design: "/suites/20260906-clean-sheet-high/runs/20260906-clean-sheet-high-claude-claude-opus-5/design.png",
        width: 3000, height: 3758, alpha: "Indexed PNG with transparency",
        evidence: "Exact paid Rule 184 / seed 7C2B10 / ember / 121-cell design from ord_1170722; MD5 matches Prodigi. 2,720,444 nontransparent pixels; bounds (169,225)–(2831,3103). Black/XL Gildan 64000, front, fillPrintArea. Earlier one-payment cart created duplicate orders 1170716/1170717. Final code still uses an idempotency header instead of Prodigi's documented JSON field; prelookup is not atomic. Latest completion event still has a pending webhook.",
      },
      {
        id: "sonnet", model: models.sonnet, commit: "bffe31cf", status: "App checkout unpaid · opaque panel",
        deployment: "https://benchmark-20260906-clean-sheet-high-coral.vercel.app",
        finalOutput: "/suites/20260906-clean-sheet-high/runs/20260906-clean-sheet-high-claude-claude-sonnet-5/final.md", design: "/suites/20260906-clean-sheet-high/runs/20260906-clean-sheet-high-claude-claude-sonnet-5/design.png",
        width: 4665, height: 5844, alpha: "RGBA · colored panel, no fully transparent pixels",
        evidence: "Exact static 418 design selected by the unpaid black/L app Session. All 27,262,260 pixels have nonzero alpha; full-canvas bounds. Gildan 64000, front, fillPrintArea. The separate 500/M direct smoke order ord_1170723 is archived as submitted.png and hash-verified. A paid $30 fixture lacked slug/size metadata, so it did not exercise customer fulfillment. Intentional themed panels are allowed for this prompt; payment and delivery remain unverified.",
      },
    ],
  },
  {
    id: "20260905-unserious-high",
    label: "2026-09-05 · Unserious prompt",
    summary: "/suites/20260905-unserious-high/summary.md",
    prompt: { path: "/suites/20260905-unserious-high/prompt.md", file: "prompt-unserious.md", revision: "47f0fee2d4632ed732b3df43ce90e4763fe117a6", sha256: "5ea01768db6286008e7b9ae6298f5396bfb729894c714e240b90676a14a331eb" },
    runs: [
      {
        id: "astra", model: models.astra, commit: "f30ffc82", status: "Paid fixture · hosted checkout unverified",
        deployment: "https://benchmark-20260905-unserious-high-codex-gpt-6-astra.vercel.app",
        finalOutput: "/suites/20260905-unserious-high/runs/20260905-unserious-high-codex-gpt-6-astra/final.md", design: "/suites/20260905-unserious-high/runs/20260905-unserious-high-codex-gpt-6-astra/design.png",
        width: 4677, height: 5881, alpha: "RGBA transparency",
        evidence: "Exact source fetched for ord_1170586; MD5 matches Prodigi. Timestamp 1788666438003; 130,769 nontransparent pixels; bounds (1299,788)–(3370,984). Black/M Gildan 5000, front, fillPrintArea. The integration test cloned an app Session, bypassed hosted shipping collection and seeded PaymentIntent shipping before paying. This verifies paid backend fulfillment, not the original customer checkout path.",
      },
      {
        id: "sol", model: models.sol, commit: "4b2dcada", status: "Hosted unpaid · ineffective print scale",
        deployment: "https://benchmark-20260905-unserious-high-c-tau.vercel.app",
        finalOutput: "/suites/20260905-unserious-high/runs/20260905-unserious-high-codex-gpt-5.6-sol/final.md", design: "/suites/20260905-unserious-high/runs/20260905-unserious-high-codex-gpt-5.6-sol/design.png",
        width: 4665, height: 5844, alpha: "Indexed PNG with transparency",
        evidence: "Live customer artwork route using timestamp 1788624000000 from an unpaid unisex/L Session; 2,728 nontransparent pixels; bounds (2034,1827)–(2640,2079). Deployed glyphs are nearly invisible; code also adds EXACTLY ONE (1) MOMENT. Separate black/M smoke order ord_1170588 fetched identical bytes (MD5 verified), but bypassed app fulfillment. Expected app mapping: Gildan 64000/64000L, front, fitPrintArea. No paid app order.",
      },
      {
        id: "terra", model: models.terra, commit: "77c7617a", status: "Hosted unpaid · extra print text",
        deployment: "https://benchmark-20260905-unserious-high-c-three.vercel.app",
        finalOutput: "/suites/20260905-unserious-high/runs/20260905-unserious-high-codex-gpt-5.6-terra/final.md", design: "/suites/20260905-unserious-high/runs/20260905-unserious-high-codex-gpt-5.6-terra/design.png",
        width: 4688, height: 5881, alpha: "RGBA transparency",
        evidence: "Live artwork route using 2026-09-06T04:00:00.000Z from the unpaid classic/M Session. 126,111 nontransparent pixels; bounds (1226,2660)–(3471,3221). Includes two slogans beyond the timestamp. Separate black/M smoke order ord_1170592 fetched identical bytes (MD5 verified), not an app payment. Both classic and roomy select TEE-AS-5001, front, fitPrintArea.",
      },
      {
        id: "luna", model: models.luna, commit: "da62384d", status: "Hosted unpaid · opaque print",
        deployment: "https://benchmark-20260905-unserious-high-c-nu.vercel.app",
        finalOutput: "/suites/20260905-unserious-high/runs/20260905-unserious-high-codex-gpt-5.6-luna/final.md", design: "/suites/20260905-unserious-high/runs/20260905-unserious-high-codex-gpt-5.6-luna/design.png",
        width: 4200, height: 5370, alpha: "RGBA, but every pixel opaque",
        evidence: "Live artwork route using unpaid fitted/M Session metadata, timestamp 1788650000123. All 22,554,000 pixels opaque; bounds cover the entire canvas. Tiny deployed glyphs plus branding on white. Separate smoke order ord_1170594 used unisex/L artwork, archived as submitted.png; its hash matches Prodigi but it is not this customer's variant. Both app fits select white TEE-AS-5001, front, fillPrintArea. No payment-to-order proof; legacy shipping extraction remains a compatibility concern.",
      },
      {
        id: "fable", model: models.fable, commit: "caa56d0c", status: "Paid E2E · completed print",
        deployment: "https://benchmark-20260905-unserious-high-c-gamma.vercel.app",
        finalOutput: "/suites/20260905-unserious-high/runs/20260905-unserious-high-claude-claude-fable-5-1/final.md", design: "/suites/20260905-unserious-high/runs/20260905-unserious-high-claude-claude-fable-5-1/design.png",
        width: 4677, height: 5881, alpha: "RGBA transparency",
        evidence: "Exact paid fitted/M source from ord_1170596; MD5 matches Prodigi. Timestamp 1788671655583; 197,939 nontransparent pixels; bounds (1105,945)–(3571,1157). Black Bella + Canvas 6004, front, fitPrintArea. Earlier localhost-source order ord_1170595 failed asset download; this later deployed source completed. Paid integration confirmed; browser-payment steps were not independently replayed.",
      },
      {
        id: "opus", model: models.opus, commit: "1490ef86", status: "Paid E2E · wrong garment fit",
        deployment: "https://benchmark-20260905-unserious-high-c-tan.vercel.app",
        finalOutput: "/suites/20260905-unserious-high/runs/20260905-unserious-high-claude-claude-opus-5/final.md", design: "/suites/20260905-unserious-high/runs/20260905-unserious-high-claude-claude-opus-5/design.png",
        width: 3300, height: 4228, alpha: "Grayscale PNG with alpha",
        evidence: "Exact paid source from ord_1170598; MD5 matches Prodigi. Timestamp 1788673722760; 127,358 nontransparent pixels; bounds (800,698)–(2595,909). Customer selected fitted/navy blue/L, but fulfillment ignores fit and submits unisex Gildan 64000, front, fillPrintArea. The raw timestamp is printable; the garment mapping fails independently. Physical placement remains unverified.",
      },
      {
        id: "sonnet", model: models.sonnet, commit: "2b5d759f", status: "Paid E2E · opaque print",
        deployment: "https://benchmark-20260905-unserious-high-c-silk.vercel.app",
        finalOutput: "/suites/20260905-unserious-high/runs/20260905-unserious-high-claude-claude-sonnet-5/final.md", design: "/suites/20260905-unserious-high/runs/20260905-unserious-high-claude-claude-sonnet-5/design.png",
        width: 1200, height: 1500, alpha: "RGBA, but every pixel opaque",
        evidence: "Exact paid white/L source from ord_1170600; MD5 matches Prodigi. Timestamp 1788675352704; all 1,800,000 pixels opaque; full-canvas bounds. Unisex Gildan 64000, front, fillPrintArea. A second paid black/M order also completed. The print includes an opaque background and ms since epoch subtitle. Missing paid-state guard and no durable failure recovery remain launch blockers.",
      },
    ],
  },
  {
    id: "20260905-minimal-high",
    label: "2026-09-05 · Minimal prompt",
    summary: "/suites/20260905-minimal-high/summary.md",
    prompt: { path: "/suites/20260905-minimal-high/prompt.md", file: "prompt-minimal.md", revision: "cbac7b40b29076ab8bc099486c8333729df00b32", sha256: "b211b5d8ded08d9e9f381b7f741f222ad5730eecb87868d4cc437ce10f8a4585" },
    runs: [
      {
        id: "astra", model: models.astra, commit: "bc1b9ba", status: "Paid E2E · 2 completed prints",
        deployment: "https://benchmark-20260905-minimal-high-cod.vercel.app",
        finalOutput: "/suites/20260905-minimal-high/runs/20260905-minimal-high-codex-gpt-6-astra/final.md", design: "/suites/20260905-minimal-high/runs/20260905-minimal-high-codex-gpt-6-astra/design.png",
        width: 4677, height: 5881, alpha: "RGBA transparency",
        evidence: "Exact full canvas from paid fitted/S Prodigi order ord_1170539. Nontransparent bounds: (1160,600)–(3517,812).",
      },
      {
        id: "sol", model: models.sol, commit: "6fb583b", status: "Paid E2E · manually verified · ineffective print scale",
        deployment: "https://benchmark-20260905-minimal-high-cod-pi.vercel.app",
        finalOutput: "/suites/20260905-minimal-high/runs/20260905-minimal-high-codex-gpt-5.6-sol/final.md", design: "/suites/20260905-minimal-high/runs/20260905-minimal-high-codex-gpt-5.6-sol/paid-design.png",
        width: 4665, height: 5844, alpha: "RGBA transparency · actual paid-order asset",
        evidence: "Post-run manual validation (2026-09-06 UTC): exact /api/artwork PNG from paid fitted/M order ord_1170585, timestamp 1788665167946. File MD5 matches Prodigi's recorded asset hash. Only 994 nontransparent pixels in a 254×12 strip; bounds: (2208,1867)–(2462,1879). Production renders tiny box-like glyphs, unlike the earlier local reconstruction. Payment and asset delivery worked; printable artwork did not. The prior unsigned webhook probe did not establish missing configuration.",
      },
      {
        id: "terra", model: models.terra, commit: "69f25c1", status: "Paid E2E · ineffective print scale",
        deployment: "https://benchmark-20260905-minimal-high-cod-six.vercel.app",
        finalOutput: "/suites/20260905-minimal-high/runs/20260905-minimal-high-codex-gpt-5.6-terra/final.md", design: "/suites/20260905-minimal-high/runs/20260905-minimal-high-codex-gpt-5.6-terra/design.png",
        width: 2490, height: 3510, alpha: "RGBA transparency",
        evidence: "Exact full canvas from paid fitted/M Prodigi order ord_1170543. Only a faint 167×13px strip is nontransparent; bounds: (1194,1496)–(1361,1509).",
      },
      {
        id: "luna", model: models.luna, commit: "8ad2f54", status: "Payment received · fulfillment failed · Session artwork",
        deployment: "https://benchmark-20260905-minimal-high-cod-nu.vercel.app",
        finalOutput: "/suites/20260905-minimal-high/runs/20260905-minimal-high-codex-gpt-5.6-luna/final.md", design: "/suites/20260905-minimal-high/runs/20260905-minimal-high-codex-gpt-5.6-luna/session-design.png",
        width: 2400, height: 2900, alpha: "RGBA transparency · paid Session artwork, not delivered",
        evidence: "Post-run user test (2026-09-06 UTC): Stripe payment completed, but no matching Prodigi order was found and one webhook delivery remained pending. The handler reads legacy session.shipping_details, absent from this event; shipping is under collected_information.shipping_details. Image fetched from the paid Session's artwork URL, timestamp 2026-09-06T03:34:31.369Z; 2,438 nontransparent pixels in tiny box-like glyph lines. Bounds: (966,1307)–(1439,1749). This is not a confirmed Prodigi asset.",
      },
      {
        id: "fable", model: models.fable, commit: "4314244", status: "Paid E2E · completed print",
        deployment: "https://benchmark-20260905-minimal-high-cla.vercel.app",
        finalOutput: "/suites/20260905-minimal-high/runs/20260905-minimal-high-claude-claude-fable-5-1/final.md", design: "/suites/20260905-minimal-high/runs/20260905-minimal-high-claude-claude-fable-5-1/design.png",
        width: 3120, height: 3860, alpha: "RGBA transparency",
        evidence: "Exact full canvas from paid unisex/L Prodigi order ord_1170551. Nontransparent bounds: (730,630)–(2389,775).",
      },
      {
        id: "opus", model: models.opus, commit: "3c96b10", status: "Paid E2E · completed print",
        deployment: "https://benchmark-20260905-minimal-high-cla-ecru.vercel.app",
        finalOutput: "/suites/20260905-minimal-high/runs/20260905-minimal-high-claude-claude-opus-5/final.md", design: "/suites/20260905-minimal-high/runs/20260905-minimal-high-claude-claude-opus-5/design.png",
        width: 3600, height: 4800, alpha: "RGBA transparency",
        evidence: "Exact full canvas from paid unisex/L Prodigi order ord_1170558. Nontransparent bounds: (625,900)–(2985,1113).",
      },
      {
        id: "sonnet", model: models.sonnet, commit: "c467d40", status: "Paid E2E · manually verified · extra branding",
        deployment: "https://benchmark-20260905-minimal-high-cla-zeta.vercel.app",
        finalOutput: "/suites/20260905-minimal-high/runs/20260905-minimal-high-claude-claude-sonnet-5/final.md", design: "/suites/20260905-minimal-high/runs/20260905-minimal-high-claude-claude-sonnet-5/paid-design.png",
        width: 2400, height: 3000, alpha: "RGBA transparency · actual paid-order asset",
        evidence: "Post-run user test (2026-09-06 UTC): exact source from paid unisex/M Prodigi order ord_1170583. File MD5 matches Prodigi's recorded asset hash. Timestamp 1788664053470; 59,737 nontransparent pixels; bounds: (660,919)–(1732,1268). Legible transparent artwork reached Prodigi, but the date subtitle and DATETIME.STORE branding fail the timestamp-only requirement.",
      },
    ],
  },
  {
    id: "20260905-beauty-high",
    label: "2026-09-05 · Beauty prompt",
    summary: "/suites/20260905-beauty-high/summary.md",
    prompt: { path: "/suites/20260905-beauty-high/prompt.md", file: "prompt-beauty.md", revision: "cbac7b40b29076ab8bc099486c8333729df00b32", sha256: "af594c565b450979255e462eacd25bd9052bf9b3cc5124cc1c2873c1d3662aa9" },
    runs: [
      {
        id: "astra", model: models.astra, commit: "2c69af3", status: "Paid E2E · completed print",
        deployment: "https://benchmark-20260905-beauty-high-codex-gpt-6-astra.vercel.app",
        finalOutput: "/suites/20260905-beauty-high/runs/20260905-beauty-high-codex-gpt-6-astra/final.md", design: "/suites/20260905-beauty-high/runs/20260905-beauty-high-codex-gpt-6-astra/design.png",
        width: 4665, height: 5844, alpha: "RGBA transparency",
        evidence: "Exact full canvas from paid Prodigi order ord_1170501. Nontransparent bounds: (1154,840)–(3519,1064).",
      },
      {
        id: "sol", model: models.sol, commit: "0cd29f6", status: "Direct smoke order · no paid E2E",
        deployment: "https://benchmark-20260905-beauty-high-code-ten.vercel.app",
        finalOutput: "/suites/20260905-beauty-high/runs/20260905-beauty-high-codex-gpt-5.6-sol/final.md", design: "/suites/20260905-beauty-high/runs/20260905-beauty-high-codex-gpt-5.6-sol/design.png",
        width: 2490, height: 3510, alpha: "Indexed transparency",
        evidence: "Exact full canvas from direct smoke Prodigi order ord_1170506. Nontransparent bounds: (327,1257)–(2156,2139).",
      },
      {
        id: "terra", model: models.terra, commit: "9905b9d", status: "Local final design · no paid E2E",
        deployment: "https://benchmark-20260905-beauty-high-code-woad.vercel.app",
        finalOutput: "/suites/20260905-beauty-high/runs/20260905-beauty-high-codex-gpt-5.6-terra/final.md", design: "/suites/20260905-beauty-high/runs/20260905-beauty-high-codex-gpt-5.6-terra/design.png",
        width: 4680, height: 5790, alpha: "RGBA transparency",
        evidence: "Exact deterministic app design reproduced from its recorded example; it never reached Prodigi. Bounds: (1044,2136)–(3633,3834).",
      },
      {
        id: "luna", model: models.luna, commit: "09100ab", status: "Direct smoke order · no paid E2E",
        deployment: "https://benchmark-20260905-beauty-high-code-one.vercel.app",
        finalOutput: "/suites/20260905-beauty-high/runs/20260905-beauty-high-codex-gpt-5.6-luna/final.md", design: "/suites/20260905-beauty-high/runs/20260905-beauty-high-codex-gpt-5.6-luna/design.png",
        width: 2400, height: 1200, alpha: "Fully opaque RGBA",
        evidence: "Exact full canvas from direct smoke Prodigi order ord_1170508. Every pixel is opaque, so changing the viewer background will not show through.",
      },
      {
        id: "fable", model: models.fable, commit: "ee364e8", status: "Paid E2E · completed print",
        deployment: "https://benchmark-20260905-beauty-high-clau.vercel.app",
        finalOutput: "/suites/20260905-beauty-high/runs/20260905-beauty-high-claude-claude-fable-5-1/final.md", design: "/suites/20260905-beauty-high/runs/20260905-beauty-high-claude-claude-fable-5-1/design.png",
        width: 2340, height: 2895, alpha: "RGBA transparency",
        evidence: "Exact full canvas from paid fitted/L Prodigi order ord_1170515. Nontransparent bounds: (538,490)–(1802,608).",
      },
      {
        id: "opus", model: models.opus, commit: "8ec5100", status: "Paid E2E · undersized print source",
        deployment: "https://benchmark-20260905-beauty-high-clau-gold.vercel.app",
        finalOutput: "/suites/20260905-beauty-high/runs/20260905-beauty-high-claude-claude-opus-5/final.md", design: "/suites/20260905-beauty-high/runs/20260905-beauty-high-claude-claude-opus-5/design.png",
        width: 320, height: 396, alpha: "RGBA transparency",
        evidence: "Exact full canvas from paid Prodigi order ord_1170523. Production art defaulted to only 320×396px; bounds: (44,53)–(276,133).",
      },
      {
        id: "sonnet", model: models.sonnet, commit: "966dc10", status: "Session design · no paid E2E",
        deployment: "https://benchmark-20260905-beauty-high-clau-two.vercel.app",
        finalOutput: "/suites/20260905-beauty-high/runs/20260905-beauty-high-claude-claude-sonnet-5/final.md", design: "/suites/20260905-beauty-high/runs/20260905-beauty-high-claude-claude-sonnet-5/design.jpg",
        width: 4665, height: 5844, alpha: "JPEG · fully opaque · unpaid Session design",
        evidence: "Customer-path artwork: full-resolution design stored on a real unpaid Checkout Session. It never reached Prodigi through a verified paid flow. Synthetic webhook tests supplied the 64×64 app icon instead; those test inputs do not establish what an actual customer order would print. JPEG has no transparency.",
      },
    ],
  },
  {
    id: "20260827-harness6-high",
    label: "2026-08-27 · Harness 6",
    summary: "/suites/20260827-harness6-high/summary.md",
    prompt: { path: "/suites/20260827-harness6-high/prompt.md", file: "prompt.md", revision: "3ca2c2c4cb9a88cdf07b7941fa0fcd282109a609", sha256: "4d3eb6c30ac497d510abb0f3bb8ec7b13ea255acd6d0b8fed28b9ec636cb1892" },
    runs: [],
  },
  {
    id: "20260825-harness6-high",
    label: "2026-08-25 · Harness 6",
    summary: "/suites/20260825-harness6-high/summary.md",
    prompt: { path: "/suites/20260825-harness6-high/prompt.md", file: "prompt.md", revision: "b8ae3ed95ad55b6697641932e686aa36a2914eb9", sha256: "4d3eb6c30ac497d510abb0f3bb8ec7b13ea255acd6d0b8fed28b9ec636cb1892" },
    runs: [],
  },
  {
    id: "20260825-fresh6-high",
    label: "2026-08-25 · Fresh 6",
    summary: "/suites/20260825-fresh6-high/summary.md",
    prompt: { path: "/suites/20260825-fresh6-high/prompt.md", file: "prompt.md", revision: "d78bcf272d77b4becb2da7bcfdb4f262a8130470", sha256: "4d3eb6c30ac497d510abb0f3bb8ec7b13ea255acd6d0b8fed28b9ec636cb1892" },
    runs: [],
  },
  {
    id: "20260823-serial-high",
    label: "2026-08-23 · Serial high",
    summary: "/suites/20260823-serial-high/summary.md",
    prompt: { path: "/suites/20260823-serial-high/prompt.md", file: "prompt.md", revision: "8a52f74ded87645e0d24e0d5c4ab3fe94ae529fa", sha256: "5eebcabf76311a711af491d7b450086d9f454ace8a153b7ca10ed1d2b99010a0" },
    runs: [],
  },
];
