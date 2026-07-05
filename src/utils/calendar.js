const DEFAULT_TIME_ZONE = "America/New_York";
const CALENDAR_PRODUCT_ID = "-//OR Music Events//Admin Calendar//EN";

const pad = (value) => String(value).padStart(2, "0");

const parseDateParts = (value) => {
  if (!value) return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return {
      year: value.getFullYear(),
      month: value.getMonth() + 1,
      day: value.getDate(),
    };
  }

  if (typeof value?.toDate === "function") {
    return parseDateParts(value.toDate());
  }

  const raw = String(value || "").trim();
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return {
      year: Number(isoMatch[1]),
      month: Number(isoMatch[2]),
      day: Number(isoMatch[3]),
    };
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parseDateParts(parsed);
};

const parseTimeParts = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return null;

  const match = raw.match(/^(\d{1,2})(?::(\d{2}))?(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (!match) return null;

  let hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  const second = Number(match[3] || 0);
  const meridiem = match[4]?.toUpperCase();

  if (meridiem === "PM" && hour < 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;

  if (
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59 ||
    second < 0 ||
    second > 59
  ) {
    return null;
  }

  return { hour, minute, second };
};

const addDays = ({ year, month, day }, days) => {
  const date = new Date(year, month - 1, day + days);
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  };
};

const compareDateTimes = (dateA, timeA, dateB, timeB) => {
  const a = new Date(
    dateA.year,
    dateA.month - 1,
    dateA.day,
    timeA.hour,
    timeA.minute,
    timeA.second
  );
  const b = new Date(
    dateB.year,
    dateB.month - 1,
    dateB.day,
    timeB.hour,
    timeB.minute,
    timeB.second
  );
  return a.getTime() - b.getTime();
};

const formatDate = ({ year, month, day }) =>
  `${year}${pad(month)}${pad(day)}`;

const formatDateTime = (date, time) =>
  `${formatDate(date)}T${pad(time.hour)}${pad(time.minute)}${pad(time.second)}`;

const formatUtcDateTime = (date = new Date()) =>
  `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(
    date.getUTCDate()
  )}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(
    date.getUTCSeconds()
  )}Z`;

const escapeIcsText = (value = "") =>
  String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");

const foldIcsLine = (line) => {
  const limit = 73;
  if (line.length <= limit) return line;

  const chunks = [];
  let rest = line;
  while (rest.length > limit) {
    chunks.push(rest.slice(0, limit));
    rest = rest.slice(limit);
  }
  chunks.push(rest);
  return chunks.join("\r\n ");
};

const property = (name, value) => foldIcsLine(`${name}:${escapeIcsText(value)}`);

const rawProperty = (name, value) => foldIcsLine(`${name}:${value}`);

const eventUid = (event = {}) => {
  const raw = [
    event.inquiryId,
    event.id,
    event.dateKey || event.date,
    event.clientName,
  ]
    .filter(Boolean)
    .join("-");
  const safe = raw
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${safe || `event-${Date.now()}`}@ormusicevents.com`;
};

const eventTitle = (event = {}) =>
  [event.clientName, event.type || "Event"].filter(Boolean).join(" - ");

const eventDescription = (event = {}, sourceUrl = "") =>
  [
    event.status ? `Status: ${event.status}` : "",
    event.clientName ? `Client: ${event.clientName}` : "",
    event.email ? `Email: ${event.email}` : "",
    event.phoneNumber ? `Phone: ${event.phoneNumber}` : "",
    event.serviceNames?.length ? `Services: ${event.serviceNames.join(", ")}` : "",
    event.eventDetails ? `Notes: ${event.eventDetails}` : "",
    sourceUrl ? `Admin link: ${sourceUrl}` : "",
  ]
    .filter(Boolean)
    .join("\n");

const eventDateLines = (event = {}, timeZone = DEFAULT_TIME_ZONE) => {
  const date = parseDateParts(event.dateKey || event.date);
  if (!date) return null;

  const start = parseTimeParts(event.startTime);
  const end = parseTimeParts(event.endTime);

  if (!start) {
    return [
      rawProperty("DTSTART;VALUE=DATE", formatDate(date)),
      rawProperty("DTEND;VALUE=DATE", formatDate(addDays(date, 1))),
    ];
  }

  let endDate = date;
  let endTime = end;

  if (!endTime) {
    const startDate = new Date(
      date.year,
      date.month - 1,
      date.day,
      start.hour + 1,
      start.minute,
      start.second
    );
    endDate = {
      year: startDate.getFullYear(),
      month: startDate.getMonth() + 1,
      day: startDate.getDate(),
    };
    endTime = {
      hour: startDate.getHours(),
      minute: startDate.getMinutes(),
      second: startDate.getSeconds(),
    };
  } else if (compareDateTimes(date, endTime, date, start) <= 0) {
    endDate = addDays(date, 1);
  }

  return [
    rawProperty(`DTSTART;TZID=${timeZone}`, formatDateTime(date, start)),
    rawProperty(`DTEND;TZID=${timeZone}`, formatDateTime(endDate, endTime)),
  ];
};

const timeZoneDefinition = (timeZone) => {
  if (timeZone !== DEFAULT_TIME_ZONE) return [];

  return [
    "BEGIN:VTIMEZONE",
    rawProperty("TZID", DEFAULT_TIME_ZONE),
    rawProperty("X-LIC-LOCATION", DEFAULT_TIME_ZONE),
    "BEGIN:DAYLIGHT",
    rawProperty("TZOFFSETFROM", "-0500"),
    rawProperty("TZOFFSETTO", "-0400"),
    rawProperty("TZNAME", "EDT"),
    rawProperty("DTSTART", "19700308T020000"),
    rawProperty("RRULE", "FREQ=YEARLY;BYMONTH=3;BYDAY=2SU"),
    "END:DAYLIGHT",
    "BEGIN:STANDARD",
    rawProperty("TZOFFSETFROM", "-0400"),
    rawProperty("TZOFFSETTO", "-0500"),
    rawProperty("TZNAME", "EST"),
    rawProperty("DTSTART", "19701101T020000"),
    rawProperty("RRULE", "FREQ=YEARLY;BYMONTH=11;BYDAY=1SU"),
    "END:STANDARD",
    "END:VTIMEZONE",
  ];
};

const calendarEvent = (event, options) => {
  const dateLines = eventDateLines(event, options.timeZone);
  if (!dateLines) return null;

  const sourceUrl =
    typeof options.getSourceUrl === "function" ? options.getSourceUrl(event) : "";

  return [
    "BEGIN:VEVENT",
    property("UID", eventUid(event)),
    rawProperty("DTSTAMP", options.generatedAt),
    ...dateLines,
    property("SUMMARY", eventTitle(event) || "OR Music Event"),
    event.venue ? property("LOCATION", event.venue) : null,
    property("DESCRIPTION", eventDescription(event, sourceUrl)),
    sourceUrl ? property("URL", sourceUrl) : null,
    "END:VEVENT",
  ].filter(Boolean);
};

export const buildIcsCalendar = (events = [], options = {}) => {
  const eventList = (Array.isArray(events) ? events : [events]).filter(Boolean);
  const timeZone = options.timeZone || DEFAULT_TIME_ZONE;
  const generatedAt = formatUtcDateTime(options.generatedAt || new Date());
  const calendarName = options.calendarName || "OR Music Events";

  const eventLines = eventList
    .flatMap((event) =>
      calendarEvent(event, {
        ...options,
        generatedAt,
        timeZone,
      })
    )
    .filter(Boolean);

  return [
    "BEGIN:VCALENDAR",
    rawProperty("VERSION", "2.0"),
    property("PRODID", CALENDAR_PRODUCT_ID),
    rawProperty("CALSCALE", "GREGORIAN"),
    rawProperty("METHOD", "PUBLISH"),
    property("X-WR-CALNAME", calendarName),
    rawProperty("X-WR-TIMEZONE", timeZone),
    ...timeZoneDefinition(timeZone),
    ...eventLines,
    "END:VCALENDAR",
    "",
  ].join("\r\n");
};

export const downloadIcsFile = (calendarText, fileName = "or-music-events.ics") => {
  if (typeof document === "undefined" || typeof URL === "undefined") return;

  const blob = new Blob([calendarText], {
    type: "text/calendar;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
};
