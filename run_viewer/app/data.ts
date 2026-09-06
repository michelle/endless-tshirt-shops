export type Storefront = {
  screenshot: string;
  favicon: { path: string; source: string; mime: string } | null;
  faviconStatus?: "found" | "missing" | "unavailable";
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
        id: "sol", model: models.sol, commit: "6fb583b", status: "No paid E2E · locally reproduced design",
        deployment: "https://benchmark-20260905-minimal-high-cod-pi.vercel.app",
        finalOutput: "/suites/20260905-minimal-high/runs/20260905-minimal-high-codex-gpt-5.6-sol/final.md", design: "/suites/20260905-minimal-high/runs/20260905-minimal-high-codex-gpt-5.6-sol/design.png",
        width: 4665, height: 5844, alpha: "RGBA transparency",
        evidence: "Exact route output reproduced from the latest unpaid Session. The actual smoke order used the opaque social image, not this design. Bounds: (629,1560)–(4050,1889).",
      },
      {
        id: "terra", model: models.terra, commit: "69f25c1", status: "Paid E2E · ineffective print scale",
        deployment: "https://benchmark-20260905-minimal-high-cod-six.vercel.app",
        finalOutput: "/suites/20260905-minimal-high/runs/20260905-minimal-high-codex-gpt-5.6-terra/final.md", design: "/suites/20260905-minimal-high/runs/20260905-minimal-high-codex-gpt-5.6-terra/design.png",
        width: 2490, height: 3510, alpha: "RGBA transparency",
        evidence: "Exact full canvas from paid fitted/M Prodigi order ord_1170543. Only a faint 167×13px strip is nontransparent; bounds: (1194,1496)–(1361,1509).",
      },
      {
        id: "luna", model: models.luna, commit: "8ad2f54", status: "Synthetic fulfillment · no paid E2E",
        deployment: "https://benchmark-20260905-minimal-high-cod-nu.vercel.app",
        finalOutput: "/suites/20260905-minimal-high/runs/20260905-minimal-high-codex-gpt-5.6-luna/final.md", design: "/suites/20260905-minimal-high/runs/20260905-minimal-high-codex-gpt-5.6-luna/design.png",
        width: 2400, height: 2900, alpha: "RGBA transparency",
        evidence: "Exact full canvas from direct synthetic Prodigi order ord_1170548. Three very small lines; bounds: (1006,1307)–(1399,1749).",
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
        id: "sonnet", model: models.sonnet, commit: "c467d40", status: "Synthetic fulfillment · no paid E2E",
        deployment: "https://benchmark-20260905-minimal-high-cla-zeta.vercel.app",
        finalOutput: "/suites/20260905-minimal-high/runs/20260905-minimal-high-claude-claude-sonnet-5/final.md", design: "/suites/20260905-minimal-high/runs/20260905-minimal-high-claude-claude-sonnet-5/design.png",
        width: 2400, height: 3000, alpha: "RGBA transparency",
        evidence: "Exact full canvas from signed synthetic Prodigi order ord_1170560. Nontransparent bounds: (686,919)–(1709,1268).",
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
        width: 4665, height: 5844, alpha: "JPEG · fully opaque",
        evidence: "Full-resolution design stored on a real unpaid Session. Synthetic Prodigi tests used the 64×64 app icon instead. JPEG has no transparency.",
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
