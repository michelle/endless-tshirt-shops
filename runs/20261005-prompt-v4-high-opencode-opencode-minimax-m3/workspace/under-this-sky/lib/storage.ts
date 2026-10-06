// lib/storage.ts
// Simple JSON-file persistence for orders + design outputs. Designed to
// run on a single Node process (Vercel functions + a tmp dir for local
// dev). All file paths are configurable — on Vercel, the read-only fs
// is /var/task and writes must go to /tmp or a hosted bucket. We
// default to /tmp/under-this-sky-data so dev runs and prod share the
// same lifecycle shape.

import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";

export interface OrderRecord {
  /** Internal order id, prefixed "uts_<hash>". */
  id: string;
  /** Stripe session id we created. */
  paymentSessionId: string;
  /** Payment mode used (stripe | demo). */
  paymentMode: string;
  /** Order payload, denormalised so /api/order-status is self-contained. */
  design: DesignRecord;
  /** Current status: awaiting_payment | paid | submitted | error. */
  status: "awaiting_payment" | "paid" | "submitted" | "error" | "cancelled";
  createdAt: string;
  updatedAt: string;
  prodigi?: {
    outcome: string;
    orderId?: string;
    error?: string;
    httpStatus?: number;
  };
  /** Stripe record reference, if available. */
  stripe?: {
    sessionId: string;
    paymentIntent?: string;
    amountTotalCents?: number;
  };
  /** Recipient captured from Stripe sessions (or demo). */
  recipient?: {
    name?: string;
    email?: string;
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postal?: string;
    country?: string;
  };
  /** Url of the SVG uploaded (used by Prodigi). */
  assetUrl?: string;
  /** Asset hash (used for cache + asset re-derivation). */
  designHash: string;
}

export interface DesignRecord {
  dateIso: string;
  lat: number;
  lng: number;
  placeName: string;
  headline: string;
  subtitle: string;
  message: string[];
  palette: "ink" | "ivory" | "rose" | "sage";
  garmentColor:
    | "white"
    | "black"
    | "navy blue"
    | "natural"
    | "sand"
    | "military green";
  garmentSize: "xs" | "s" | "m" | "l" | "xl" | "2xl" | "3xl";
  quantity: number;
}

export interface DesignAssetRecord {
  /** Filename within the asset directory (after stripping slashes). */
  filename: string;
  /** "svg" or "png". */
  fmt: string;
  /** Content type. */
  contentType: string;
}

export class Storage {
  readonly root: string;
  readonly dataDir: string;
  readonly assetsDir: string;

  constructor(opts: { dataDir?: string } = {}) {
    const envDir = opts.dataDir || process.env.DATA_DIR || "";
    this.root = envDir && envDir !== "" ? envDir : path.join(os.tmpdir(), "under-this-sky-data");
    this.dataDir = path.join(this.root, "data");
    this.assetsDir = path.join(this.root, "assets");
  }

  async init(): Promise<void> {
    await fs.mkdir(this.dataDir, { recursive: true });
    await fs.mkdir(this.assetsDir, { recursive: true });
  }

  /** Filename-safe id (no slashes). */
  static id(prefix: string): string {
    return `${prefix}_${crypto.randomBytes(6).toString("hex")}`;
  }

  async writeOrder(order: OrderRecord): Promise<void> {
    await this.init();
    const safe = sanitizeId(order.id);
    const file = path.join(this.dataDir, `${safe}.json`);
    await fs.writeFile(file, JSON.stringify(order, null, 2), "utf8");
  }

  async readOrder(id: string): Promise<OrderRecord | null> {
    await this.init();
    const safe = sanitizeId(id);
    const file = path.join(this.dataDir, `${safe}.json`);
    try {
      const txt = await fs.readFile(file, "utf8");
      return JSON.parse(txt) as OrderRecord;
    } catch {
      return null;
    }
  }

  async listOrders(): Promise<OrderRecord[]> {
    await this.init();
    const files = await fs.readdir(this.dataDir);
    const out: OrderRecord[] = [];
    for (const f of files) {
      if (!f.endsWith(".json")) continue;
      try {
        const txt = await fs.readFile(path.join(this.dataDir, f), "utf8");
        out.push(JSON.parse(txt));
      } catch {
        // ignore
      }
    }
    return out;
  }

  async writeAsset(
    bytes: Buffer,
    opts: { hash: string; ext: "png" | "svg" }
  ): Promise<string> {
    await this.init();
    const filename = `${opts.hash}.${opts.ext}`;
    const file = path.join(this.assetsDir, filename);
    await fs.writeFile(file, bytes);
    return filename;
  }

  async readAsset(
    filename: string
  ): Promise<{ bytes: Buffer; contentType: string } | null> {
    await this.init();
    const safe = sanitizeFilename(filename);
    const ext = path.extname(safe).slice(1).toLowerCase();
    if (ext !== "png" && ext !== "svg") return null;
    const file = path.join(this.assetsDir, safe);
    try {
      const bytes = await fs.readFile(file);
      const contentType = ext === "png" ? "image/png" : "image/svg+xml";
      return { bytes, contentType };
    } catch {
      return null;
    }
  }

  /**
   * Returns the public URL of the asset with the requested extension,
   * falling back across png ↔ svg. We don't care which was actually
   * stored: the asset endpoint serves either.
   */
  assetPublicUrlForAny(hash: string, baseUrl: string): string {
    return `${stripTrailingSlash(baseUrl)}/api/asset/${encodeURIComponent(hash)}`;
  }

  /**
   * Render an absolute asset URL suitable for Prodigi to download.
   * Uses APP_BASE_URL when provided, otherwise the host detected
   * at call time. Returns a single canonical URL that serves whichever
   * extension was actually stored.
   */
  assetPublicUrl(filename: string | null, baseUrl: string): string {
    if (filename) {
      const safe = sanitizeFilename(filename);
      // /api/asset/[hash] serves both .png and .svg by hash stem.
      const stem = safe.replace(/\.(png|svg)$/i, "");
      return `${stripTrailingSlash(baseUrl)}/api/asset/${encodeURIComponent(stem)}`;
    }
    // Defensive fallback — should not occur in practice.
    return `${stripTrailingSlash(baseUrl)}/api/asset/`;
  }
}

function sanitizeId(s: string): string {
  return s.replace(/[^a-zA-Z0-9_\-]/g, "_");
}

function sanitizeFilename(s: string): string {
  // Allow only the .png | .svg tail + base64-url safe stem.
  const trimmed = s.replace(/[^a-zA-Z0-9_\-\.]/g, "_");
  return trimmed;
}

function stripTrailingSlash(s: string): string {
  return s.endsWith("/") ? s.slice(0, -1) : s;
}
