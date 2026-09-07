import assert from "node:assert/strict";
import { test } from "node:test";
import { artworkPath, artworkText, describeTimestamp, isValidTimestamp, parseArtworkFileName } from "../src/lib/artwork";

test("artwork text is the raw unix millisecond timestamp", () => {
  assert.equal(artworkText(1_800_000_000_123), "1800000000123");
  assert.equal(artworkPath(1_800_000_000_123), "/api/artwork/1800000000123.png");
});

test("artwork file names round-trip", () => {
  assert.equal(parseArtworkFileName("1800000000123.png"), 1_800_000_000_123);
  assert.equal(parseArtworkFileName("1800000000123"), null);
  assert.equal(parseArtworkFileName("abc.png"), null);
  assert.equal(parseArtworkFileName("../etc/passwd"), null);
  assert.equal(parseArtworkFileName("99999999999999999999.png"), null);
});

test("timestamp validation window", () => {
  const now = 1_800_000_000_000;
  assert.equal(isValidTimestamp(now, now), true);
  assert.equal(isValidTimestamp(now - 60_000, now), true);
  assert.equal(isValidTimestamp(now + 60_000, now), true);
  assert.equal(isValidTimestamp(now + 10 * 60_000, now), false);
  assert.equal(isValidTimestamp(now - 25 * 3600 * 1000, now), false);
  assert.equal(isValidTimestamp("x", now), false);
});

test("describeTimestamp is ISO 8601 in UTC", () => {
  assert.equal(describeTimestamp(0), "1970-01-01T00:00:00.000Z");
});
