const crypto = require("crypto");

const DEFAULT_FEED_ID = "admin";

const toBase64Url = (buffer) =>
  buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

const safeCompare = (first, second) => {
  const firstBuffer = Buffer.from(String(first || ""));
  const secondBuffer = Buffer.from(String(second || ""));
  if (firstBuffer.length !== secondBuffer.length) return false;
  return crypto.timingSafeEqual(firstBuffer, secondBuffer);
};

const tokenPayload = (feedId = DEFAULT_FEED_ID, subscriptionId = "") => {
  const id = String(feedId || DEFAULT_FEED_ID).trim();
  const subId = String(subscriptionId || "").trim();

  if (!id) throw new Error("A feed id is required.");

  return subId ? `${id}.${subId}` : id;
};

const signFeedToken = (
  feedId = DEFAULT_FEED_ID,
  signingKey = "",
  subscriptionId = ""
) => {
  const payload = tokenPayload(feedId, subscriptionId);
  const key = String(signingKey || "");

  if (!key) throw new Error("CALENDAR_FEED_SIGNING_KEY is required.");

  const signature = toBase64Url(
    crypto.createHmac("sha256", key).update(payload).digest()
  );
  return `${payload}.${signature}`;
};

const parseFeedToken = (
  token = "",
  signingKey = "",
  expectedFeedId = DEFAULT_FEED_ID
) => {
  const raw = String(token || "").trim();
  const parts = raw.split(".");
  if (![2, 3].includes(parts.length)) return { valid: false };

  const [feedId, middle, maybeSignature] = parts;
  const subscriptionId = parts.length === 3 ? middle : "";
  const signature = parts.length === 3 ? maybeSignature : middle;

  if (feedId !== expectedFeedId || !signature) return { valid: false };

  try {
    const expectedToken = signFeedToken(feedId, signingKey, subscriptionId);
    const expectedSignature = expectedToken.split(".").at(-1);
    const valid = safeCompare(signature, expectedSignature);
    return valid
      ? { valid, feedId, subscriptionId }
      : { valid: false };
  } catch {
    return { valid: false };
  }
};

const validateFeedToken = (...args) => parseFeedToken(...args).valid;

module.exports = {
  DEFAULT_FEED_ID,
  parseFeedToken,
  signFeedToken,
  validateFeedToken,
};
