const { initializeApp, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { logger } = require("firebase-functions");
const { defineSecret } = require("firebase-functions/params");
const { HttpsError, onCall, onRequest } = require("firebase-functions/v2/https");
const { buildAdminCalendarFeed } = require("./lib/adminCalendar");
const {
  DEFAULT_FEED_ID,
  signFeedToken,
  validateFeedToken,
} = require("./lib/feedToken");

const REGION = "us-central1";
const ADMIN_APP_BASE_URL = "https://ormusicevents.com";
const CALENDAR_FEED_SIGNING_KEY = defineSecret("CALENDAR_FEED_SIGNING_KEY");

if (!getApps().length) {
  initializeApp();
}

const firestore = () => getFirestore();

const signingKey = () => {
  const key =
    CALENDAR_FEED_SIGNING_KEY.value() || process.env.CALENDAR_FEED_SIGNING_KEY;
  if (!key) throw new Error("CALENDAR_FEED_SIGNING_KEY is not configured.");
  return key;
};

const projectId = () => {
  if (process.env.GCLOUD_PROJECT) return process.env.GCLOUD_PROJECT;
  if (process.env.GCP_PROJECT) return process.env.GCP_PROJECT;

  try {
    const firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG || "{}");
    if (firebaseConfig.projectId) return firebaseConfig.projectId;
  } catch {}

  return "or-music-events";
};

const adminAppBaseUrl = () =>
  process.env.ADMIN_APP_BASE_URL || ADMIN_APP_BASE_URL;

const feedBaseUrl = () =>
  process.env.CALENDAR_FEED_BASE_URL ||
  `https://${REGION}-${projectId()}.cloudfunctions.net/adminCalendarFeed`;

const feedUrlForToken = (token) => {
  const url = new URL(feedBaseUrl());
  url.searchParams.set("token", token);
  return url.toString();
};

const webcalUrlFor = (feedUrl) => feedUrl.replace(/^https:/i, "webcal:");

const assertAdmin = async (auth) => {
  const uid = auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "Sign in to get the calendar feed.");
  }

  const userSnap = await firestore().collection("users").doc(uid).get();
  if (!userSnap.exists || userSnap.data()?.isAdmin !== true) {
    throw new HttpsError(
      "permission-denied",
      "Only admins can get the calendar feed."
    );
  }
};

exports.adminCalendarFeedUrl = onCall(
  {
    region: REGION,
    secrets: [CALENDAR_FEED_SIGNING_KEY],
  },
  async (request) => {
    await assertAdmin(request.auth);

    const token = signFeedToken(DEFAULT_FEED_ID, signingKey());
    const feedUrl = feedUrlForToken(token);

    return {
      feedUrl,
      webcalUrl: webcalUrlFor(feedUrl),
    };
  }
);

exports.adminCalendarFeed = onRequest(
  {
    region: REGION,
    secrets: [CALENDAR_FEED_SIGNING_KEY],
    timeoutSeconds: 30,
    memory: "256MiB",
    invoker: "public",
  },
  async (request, response) => {
    if (!["GET", "HEAD"].includes(request.method)) {
      response.set("Allow", "GET, HEAD");
      response.status(405).send("Method not allowed");
      return;
    }

    const rawToken = Array.isArray(request.query.token)
      ? request.query.token[0]
      : request.query.token;

    if (!validateFeedToken(rawToken, signingKey(), DEFAULT_FEED_ID)) {
      response.status(403).send("Forbidden");
      return;
    }

    try {
      const calendarText = await buildAdminCalendarFeed({
        db: firestore(),
        appBaseUrl: adminAppBaseUrl(),
      });

      response.set({
        "Cache-Control": "private, no-cache, no-store, max-age=0, must-revalidate",
        "Content-Disposition": 'inline; filename="or-music-admin-calendar.ics"',
        "Content-Type": "text/calendar; charset=utf-8",
        Pragma: "no-cache",
      });

      if (request.method === "HEAD") {
        response.status(200).end();
        return;
      }

      response.status(200).send(calendarText);
    } catch (error) {
      logger.error("Admin calendar feed failed", error);
      response.status(500).send("Calendar feed failed");
    }
  }
);
