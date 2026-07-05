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

const signFeedToken = (feedId = DEFAULT_FEED_ID, signingKey = "") => {
  const id = String(feedId || DEFAULT_FEED_ID).trim();
  const key = String(signingKey || "");

  if (!id) throw new Error("A feed id is required.");
  if (!key) throw new Error("CALENDAR_FEED_SIGNING_KEY is required.");

  const signature = toBase64Url(
    crypto.createHmac("sha256", key).update(id).digest()
  );
  return `${id}.${signature}`;
};

const validateFeedToken = (
  token = "",
  signingKey = "",
  expectedFeedId = DEFAULT_FEED_ID
) => {
  const raw = String(token || "").trim();
  const dotIndex = raw.indexOf(".");
  if (dotIndex <= 0) return false;

  const feedId = raw.slice(0, dotIndex);
  const signature = raw.slice(dotIndex + 1);

  if (feedId !== expectedFeedId || !signature) return false;

  try {
    const expectedToken = signFeedToken(feedId, signingKey);
    const expectedSignature = expectedToken.slice(expectedToken.indexOf(".") + 1);
    return safeCompare(signature, expectedSignature);
  } catch {
    return false;
  }
};

module.exports = {
  DEFAULT_FEED_ID,
  signFeedToken,
  validateFeedToken,
};
