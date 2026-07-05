const assert = require("node:assert/strict");
const test = require("node:test");
const {
  DEFAULT_FEED_ID,
  signFeedToken,
  validateFeedToken,
} = require("./feedToken");

test("signs and validates a calendar feed token", () => {
  const token = signFeedToken(DEFAULT_FEED_ID, "test-secret");

  assert.equal(validateFeedToken(token, "test-secret"), true);
  assert.equal(validateFeedToken(token, "wrong-secret"), false);
  assert.equal(validateFeedToken(token.replace("admin", "other"), "test-secret"), false);
});
