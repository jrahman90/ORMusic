const { buildIcsCalendar } = require("./calendarIcs");

const ADMIN_APP_BASE_URL = "https://ormusicevents.com";

const normalizeEvents = (events = []) =>
  (Array.isArray(events) ? events : []).map((event, index) => ({
    ...event,
    id: event?.id || `event-${index}`,
    sourceIndex: index,
  }));

const dateKey = (value) => {
  if (!value) return "";
  if (typeof value?.toDate === "function") return dateKey(value.toDate());
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "";
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  const raw = String(value || "").trim();
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? "" : dateKey(parsed);
};

const coerceDate = (value) => {
  if (!value) return null;
  if (typeof value?.toDate === "function") return value.toDate();
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const eventSort = (first, second) => {
  const firstDate = String(first.dateKey || "");
  const secondDate = String(second.dateKey || "");
  if (firstDate !== secondDate) return firstDate.localeCompare(secondDate);

  const firstTime = String(first.startTime || "");
  const secondTime = String(second.startTime || "");
  if (firstTime !== secondTime) return firstTime.localeCompare(secondTime);

  return String(first.summary || "").localeCompare(String(second.summary || ""));
};

const eventDetailsUrl = (appBaseUrl, inquiryId, eventId) => {
  const base = String(appBaseUrl || ADMIN_APP_BASE_URL).replace(/\/+$/g, "");
  return `${base}/dashboard-admin/events/${encodeURIComponent(
    inquiryId
  )}/${encodeURIComponent(eventId)}`;
};

const calendarStatusFor = (status = "") => {
  const normalized = String(status || "").trim().toLowerCase();
  if (["cancelled", "canceled", "rejected"].includes(normalized)) {
    return "CANCELLED";
  }
  if (["processing", "pending"].includes(normalized)) return "TENTATIVE";
  return "CONFIRMED";
};

const normalizeAllocations = (item = {}, events = []) => {
  const eventIds = new Set(events.map((event) => event.id));
  const totalQty = Math.max(0, Number(item?.quantity || 0));
  const raw = Array.isArray(item?.eventAllocations)
    ? item.eventAllocations
    : [];
  const allocations = raw
    .map((row) => ({
      eventId: row?.eventId || "",
      quantity: Math.max(0, Number(row?.quantity || 0)),
    }))
    .filter((row) => row.quantity > 0 && eventIds.has(row.eventId));

  if (allocations.length === 0 && item?.eventId && eventIds.has(item.eventId)) {
    return [{ eventId: item.eventId, quantity: totalQty }];
  }

  if (allocations.length === 0 && events.length === 1 && !item?.eventId) {
    return [{ eventId: events[0].id, quantity: totalQty }];
  }

  const capped = [];
  let used = 0;
  allocations.forEach((row) => {
    const remaining = Math.max(0, totalQty - used);
    const quantity = Math.min(row.quantity, remaining);
    if (quantity > 0) {
      capped.push({ ...row, quantity });
      used += quantity;
    }
  });
  return capped;
};

const isPackage = (item = {}) => {
  const categories = Array.isArray(item.categories) ? item.categories : [];
  return categories.map((category) => String(category).toLowerCase()).includes("packages");
};

const emptyItemGroups = () => ({
  packages: [],
  items: [],
  generalPackages: [],
  generalItems: [],
});

const pushGroupedItem = (groups, key, item, quantity) => {
  if (quantity <= 0) return;
  groups[key].push({
    ...item,
    assignedQuantity: quantity,
  });
};

const groupedItemsForEvent = (inquiry = {}, event = {}, events = []) => {
  const groups = emptyItemGroups();
  const items = Array.isArray(inquiry.items) ? inquiry.items : [];

  items.forEach((item) => {
    const totalQty = Math.max(0, Number(item?.quantity || 0));
    const allocations = normalizeAllocations(item, events);
    const assignedQty = allocations
      .filter((row) => row.eventId === event.id)
      .reduce((sum, row) => sum + Number(row.quantity || 0), 0);
    const allocatedQty = allocations.reduce(
      (sum, row) => sum + Number(row.quantity || 0),
      0
    );
    const unassignedQty = Math.max(0, totalQty - allocatedQty);
    const assignedKey = isPackage(item) ? "packages" : "items";
    const generalKey = isPackage(item) ? "generalPackages" : "generalItems";

    pushGroupedItem(groups, assignedKey, item, assignedQty);
    pushGroupedItem(groups, generalKey, item, unassignedQty);
  });

  return groups;
};

const formatItemLine = (item = {}) => {
  const quantity = Math.max(0, Number(item.assignedQuantity || item.quantity || 0));
  return `- ${item.name || "Unnamed item"} x${quantity}`;
};

const appendItemGroup = (lines, label, items) => {
  if (!items.length) return;
  lines.push("", `${label}:`);
  items.forEach((item) => lines.push(formatItemLine(item)));
};

const eventDescription = ({ inquiry, event, events, url }) => {
  const status = inquiry.status || "Processing";
  const clientName = inquiry.name || inquiry.userName || "Unknown client";
  const email = inquiry.email || inquiry.userEmail || "";
  const phoneNumber = inquiry.phoneNumber || "";
  const groups = groupedItemsForEvent(inquiry, event, events);
  const lines = [
    `Status: ${status}`,
    `Client: ${clientName}`,
    email ? `Email: ${email}` : "",
    phoneNumber ? `Phone: ${phoneNumber}` : "",
    event.type ? `Event type: ${event.type}` : "",
    event.venue ? `Venue: ${event.venue}` : "",
  ].filter(Boolean);

  appendItemGroup(lines, "Packages", groups.packages);
  appendItemGroup(lines, "Items", groups.items);
  appendItemGroup(lines, "General packages", groups.generalPackages);
  appendItemGroup(lines, "General items", groups.generalItems);

  if (
    !groups.packages.length &&
    !groups.items.length &&
    !groups.generalPackages.length &&
    !groups.generalItems.length
  ) {
    lines.push("", "Packages/items: None assigned.");
  }

  lines.push("", `Admin link: ${url}`);

  return lines.join("\n");
};

const eventSummary = (inquiry = {}, event = {}) => {
  const status = inquiry.status || "Processing";
  const clientName = inquiry.name || inquiry.userName || "Unknown client";
  const type = event.type || "Event";
  return `${clientName} - ${type} [${status}]`;
};

const lastModifiedForDoc = (docSnap) =>
  coerceDate(docSnap.updateTime) ||
  coerceDate(docSnap.data()?.updatedAt) ||
  coerceDate(docSnap.data()?.timestamp) ||
  new Date();

const calendarEventsFromInquiryDoc = (docSnap, options = {}) => {
  const inquiry = docSnap.data() || {};
  const events = normalizeEvents(inquiry.events);
  const lastModified = lastModifiedForDoc(docSnap);
  const sequence = Math.max(0, Math.floor(lastModified.getTime() / 1000));
  const appBaseUrl = options.appBaseUrl || ADMIN_APP_BASE_URL;

  return events
    .map((event) => {
      const eventDateKey = dateKey(event.date);
      if (!eventDateKey) return null;

      const url = eventDetailsUrl(appBaseUrl, docSnap.id, event.id);
      const status = inquiry.status || "Processing";

      return {
        uid: `${docSnap.id}-${event.id}@ormusicevents.com`,
        inquiryId: docSnap.id,
        id: event.id,
        date: event.date || eventDateKey,
        dateKey: eventDateKey,
        startTime: event.startTime || "",
        endTime: event.endTime || "",
        summary: eventSummary(inquiry, event),
        location: event.venue || "",
        description: eventDescription({ inquiry, event, events, url }),
        url,
        calendarStatus: calendarStatusFor(status),
        categories: [status, event.type || "Event"].filter(Boolean),
        lastModified,
        sequence,
      };
    })
    .filter(Boolean);
};

const buildAdminCalendarFeed = async ({ db, appBaseUrl, generatedAt } = {}) => {
  if (!db) throw new Error("Firestore db is required.");

  const snapshot = await db.collection("inquiries").get();
  const events = snapshot.docs
    .flatMap((docSnap) =>
      calendarEventsFromInquiryDoc(docSnap, {
        appBaseUrl,
      })
    )
    .sort(eventSort);

  return buildIcsCalendar(events, {
    calendarName: "OR Music Events",
    generatedAt,
  });
};

module.exports = {
  buildAdminCalendarFeed,
  calendarEventsFromInquiryDoc,
  eventDescription,
  groupedItemsForEvent,
};
