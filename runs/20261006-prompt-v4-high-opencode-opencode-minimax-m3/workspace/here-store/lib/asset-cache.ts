/**
 * Asset caching helpers. We pre-render the high-res PNG at checkout time
 * so the same bytes are reused when we POST to Prodigi in the webhook.
 */

const MAX_CACHE_BYTES = 96 * 1024 * 1024; // 96 MB
const MAX_CACHE_ENTRIES = 200;

interface CacheEntry {
  buf: Buffer;
  width: number;
  height: number;
  bytes: number;
  ts: number;
  /** links id ↔ key */
  id: string;
  key: string;
}

class AssetCache {
  private byKey = new Map<string, CacheEntry>();
  private byId = new Map<string, CacheEntry>();
  private totalBytes = 0;

  set(key: string, id: string, buf: Buffer, width: number, height: number) {
    const byKeyEntry = this.byKey.get(key);
    if (byKeyEntry) {
      this.totalBytes -= byKeyEntry.bytes;
      this.byKey.delete(key);
      this.byId.delete(byKeyEntry.id);
    }
    const byIdEntry = this.byId.get(id);
    if (byIdEntry && byIdEntry.key !== key) {
      this.totalBytes -= byIdEntry.bytes;
      this.byKey.delete(byIdEntry.key);
    }
    const bytes = buf.byteLength;
    if (bytes > MAX_CACHE_BYTES) return; // skip caching huge assets
    const entry: CacheEntry = { buf, width, height, bytes, ts: Date.now(), id, key };
    this.byKey.set(key, entry);
    this.byId.set(id, entry);
    this.totalBytes += bytes;
    this.gc();
  }

  byOrderId(id: string): CacheEntry | undefined {
    return this.byId.get(id);
  }

  byKeyValue(key: string): CacheEntry | undefined {
    return this.byKey.get(key);
  }

  gc() {
    while (this.byKey.size > MAX_CACHE_ENTRIES || this.totalBytes > MAX_CACHE_BYTES) {
      const oldest = [...this.byKey.entries()].sort((a, b) => a[1].ts - b[1].ts)[0];
      if (!oldest) break;
      this.totalBytes -= oldest[1].bytes;
      this.byKey.delete(oldest[0]);
      this.byId.delete(oldest[1].id);
    }
  }
}

const globalAny = globalThis as unknown as { __here_assets?: AssetCache };
const cache = globalAny.__here_assets ?? new AssetCache();
if (!globalAny.__here_assets) globalAny.__here_assets = cache;

export const assetCache = cache;

export function produceAssetUrlOrCache(buf: Buffer, width: number, height: number, orderId: string, key: string): string {
  cache.set(key, orderId, buf, width, height);
  return `/api/asset/${orderId}`;
}
