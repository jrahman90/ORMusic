const assert = require("node:assert/strict");
const test = require("node:test");
const {
  DEFAULT_FEED_ID,
  parseFeedToken,
  signFeedToken,
  validateFeedToken,
} = require("./feedToken");

test("signs and validates a calendar feed token", () => {
  const token = signFeedToken(DEFAULT_FEED_ID, "test-secret");

  assert.equal(validateFeedToken(token, "test-secret"), true);
  assert.equal(validateFeedToken(token, "wrong-secret"), false);
  assert.equal(validateFeedToken(token.replace("admin", "other"), "test-secret"), false);
});

test("signs and validates a per-subscription calendar feed token", () => {
  const token = signFeedToken(DEFAULT_FEED_ID, "test-secret", "sub-123");
  const parsed = parseFeedToken(token, "test-secret");

  assert.equal(validateFeedToken(token, "test-secret"), true);
  assert.equal(parsed.valid, true);
  assert.equal(parsed.feedId, DEFAULT_FEED_ID);
  assert.equal(parsed.subscriptionId, "sub-123");
  assert.equal(validateFeedToken(token, "wrong-secret"), false);
});
