CREATE TABLE orders (
 id TEXT PRIMARY KEY,
 status_token TEXT NOT NULL,
 request_id TEXT NOT NULL UNIQUE,
 design TEXT NOT NULL,
 asset_key TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending_payment',
 session_id TEXT UNIQUE,
 amount INTEGER NOT NULL,
 currency TEXT NOT NULL DEFAULT 'usd',
 payment_mode TEXT NOT NULL,
 prodigi_id TEXT,
 recipient TEXT,
 last_error TEXT,
 lease_until INTEGER NOT NULL DEFAULT 0,
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL
);
CREATE INDEX orders_status ON orders(status, updated_at);
CREATE TABLE rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL DEFAULT 1);
