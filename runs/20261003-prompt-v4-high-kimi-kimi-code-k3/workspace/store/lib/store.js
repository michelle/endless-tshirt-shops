// In-memory order record store. NOTE: ephemeral on serverless — fine for the
// sandbox demo; replace with a real database (e.g. Postgres/Redis) for production.
const orders = new Map(); // stripeSessionId -> { status, prodigiOrderId, design, error, at }
const processedEvents = new Map(); // stripe event id -> true (webhook idempotency)

module.exports = { orders, processedEvents };
