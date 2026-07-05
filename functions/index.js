const crypto = require("crypto");
const { initializeApp, getApps } = require("firebase-admin/app");
const { FieldValue, getFirestore } = require("firebase-admin/firestore");
const { logger } = require("firebase-functions");
const { defineSecret } = require("firebase-functions/params");
const { HttpsError, onCall, onRequest } = require("firebase-functions/v2/https");
const { buildAdminCalendarFeed } = require("./lib/adminCalendar");
const {
  DEFAULT_FEED_ID,
  parseFeedToken,
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

const subscriptionsRef = () => firestore().collection("calendarSubscriptions");

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

const coerceDate = (value) => {
  if (!value) return null;
  if (typeof value?.toDate === "function") return value.toDate();
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const isoDate = (value) => coerceDate(value)?.toISOString() || "";

const sanitizeSubscription = (docSnap) => {
  const data = docSnap.data() || {};
  return {
    id: docSnap.id,
    active: data.active !== false,
    label: data.label || "",
    createdByUid: data.createdByUid || "",
    createdByName: data.createdByName || "",
    createdByEmail: data.createdByEmail || "",
    createdAt: isoDate(data.createdAt),
    lastFetchedAt: isoDate(data.lastFetchedAt),
    lastUserAgent: data.lastUserAgent || "",
    revokedAt: isoDate(data.revokedAt),
    revokedByUid: data.revokedByUid || "",
  };
};

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

  return {
    uid,
    user: userSnap.data() || {},
  };
};

const createCalendarSubscription = async (auth, data = {}) => {
  const { uid, user } = await assertAdmin(auth);
  const subscriptionId = crypto.randomBytes(18).toString("base64url");
  const label =
    String(data?.label || "").trim() ||
    `${user.name || auth?.token?.name || "Admin"} calendar`;
  const token = signFeedToken(
    DEFAULT_FEED_ID,
    signingKey(),
    subscriptionId
  );
  const feedUrl = feedUrlForToken(token);
  const docRef = subscriptionsRef().doc(subscriptionId);

  await docRef.set({
    active: true,
    feedId: DEFAULT_FEED_ID,
    label,
    createdByUid: uid,
    createdByName: user.name || auth?.token?.name || "",
    createdByEmail: user.email || auth?.token?.email || "",
    createdAt: FieldValue.serverTimestamp(),
    lastFetchedAt: null,
    lastUserAgent: "",
    revokedAt: null,
    revokedByUid: "",
  });

  const docSnap = await docRef.get();
  return {
    feedUrl,
    webcalUrl: webcalUrlFor(feedUrl),
    subscription: sanitizeSubscription(docSnap),
  };
};

exports.adminCalendarFeedUrl = onCall(
  {
    region: REGION,
    secrets: [CALENDAR_FEED_SIGNING_KEY],
  },
  async (request) => {
    return createCalendarSubscription(request.auth, request.data);
  }
);

exports.adminCalendarCreateSubscription = onCall(
  {
    region: REGION,
    secrets: [CALENDAR_FEED_SIGNING_KEY],
  },
  async (request) => createCalendarSubscription(request.auth, request.data)
);

exports.adminCalendarSubscriptions = onCall(
  {
    region: REGION,
  },
  async (request) => {
    await assertAdmin(request.auth);

    const snapshot = await subscriptionsRef()
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    return {
      subscriptions: snapshot.docs.map(sanitizeSubscription),
    };
  }
);

exports.adminCalendarRevokeSubscription = onCall(
  {
    region: REGION,
  },
  async (request) => {
    const { uid } = await assertAdmin(request.auth);
    const subscriptionId = String(request.data?.subscriptionId || "").trim();

    if (!subscriptionId) {
      throw new HttpsError(
        "invalid-argument",
        "A subscription id is required."
      );
    }

    const docRef = subscriptionsRef().doc(subscriptionId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      throw new HttpsError("not-found", "Calendar subscription not found.");
    }

    await docRef.update({
      active: false,
      revokedAt: FieldValue.serverTimestamp(),
      revokedByUid: uid,
    });

    return { ok: true };
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

    const parsedToken = parseFeedToken(
      rawToken,
      signingKey(),
      DEFAULT_FEED_ID
    );

    if (!parsedToken.valid) {
      response.status(403).send("Forbidden");
      return;
    }

    try {
      if (parsedToken.subscriptionId) {
        const subscriptionRef = subscriptionsRef().doc(
          parsedToken.subscriptionId
        );
        const subscriptionSnap = await subscriptionRef.get();

        if (
          !subscriptionSnap.exists ||
          subscriptionSnap.data()?.active === false
        ) {
          response.status(403).send("Forbidden");
          return;
        }

        await subscriptionRef.update({
          lastFetchedAt: FieldValue.serverTimestamp(),
          lastUserAgent: request.get("user-agent") || "",
        });
      } else if (!validateFeedToken(rawToken, signingKey(), DEFAULT_FEED_ID)) {
        response.status(403).send("Forbidden");
        return;
      }

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
