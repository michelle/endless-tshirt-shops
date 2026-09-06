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
  deployment: string;
  finalOutput: string;
  design: string;
  width: number;
  height: number;
  alpha: string;
  evidence: string;
};

export type Suite = {
  id: string;
  label: string;
  summary: string;
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
    id: "20260905-unserious-high",
    label: "2026-09-05 · Unserious prompt",
    summary: "/suites/20260905-unserious-high/summary.md",
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
    runs: [],
  },
  {
    id: "20260825-harness6-high",
    label: "2026-08-25 · Harness 6",
    summary: "/suites/20260825-harness6-high/summary.md",
    runs: [],
  },
  {
    id: "20260825-fresh6-high",
    label: "2026-08-25 · Fresh 6",
    summary: "/suites/20260825-fresh6-high/summary.md",
    runs: [],
  },
  {
    id: "20260823-serial-high",
    label: "2026-08-23 · Serial high",
    summary: "/suites/20260823-serial-high/summary.md",
    runs: [],
  },
];
