// Convert "14:05" or "14:05:30" to "2:05 PM".
// If it already includes AM or PM, return it unchanged.
export const to12h = (timeStr = "") => {
  const raw = String(timeStr || "").trim();
  if (!raw) return "";
  if (/(am|pm)$/i.test(raw)) return raw.toUpperCase();

  const parts = raw.split(":"); // ["14","05"] or ["14","05","30"]
  const hStr = parts[0] ?? "";
  const mStr = parts[1] ?? "00";
  let h = Number(hStr);
  if (!Number.isFinite(h)) return raw;

  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;

  const m = String(mStr).padStart(2, "0");
  return `${h}:${m} ${ampm}`;
};

// Convert "2025-09-26" to "Sep 26, 2025".
export const prettyDate = (isoDate = "") => {
  const raw = String(isoDate || "").trim();
  if (!raw) return "";
  try {
    const d = new Date(`${raw}T00:00:00`);
    if (isNaN(d.getTime())) return raw;
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return raw;
  }
};

// Firestore Timestamp to "Sep 26, 2025, 1:23 PM"
export const prettyDateTimeFromTs = (ts) => {
  try {
    const d = ts?.toDate ? ts.toDate() : null;
    if (!d) return "N/A";
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "N/A";
  }
};

/* =======================
   Extra deposit formatter
   ======================= */

// Accepts Firestore Timestamp, JS Date, ISO string, or epoch millis
const _toDateFlexible = (input) => {
  try {
    if (!input) return null;
    if (typeof input?.toDate === "function") return input.toDate(); // Firestore Timestamp
    if (input instanceof Date) return input; // JS Date
    if (typeof input === "number") return new Date(input); // epoch millis
    if (typeof input === "string") return new Date(input); // ISO string
  } catch {}
  return null;
};

// Format as mm/dd/yy hh:mm AM/PM for deposits, returns "N/A" if invalid
export const prettyDateTimeMMDDYY = (input) => {
  const d = _toDateFlexible(input);
  if (!d || Number.isNaN(d.getTime())) return "N/A";

  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  let h = d.getHours();
  const mins = String(d.getMinutes()).padStart(2, "0");
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;

  return `${mm}/${dd}/${yy} ${h}:${mins} ${ap}`;
};
