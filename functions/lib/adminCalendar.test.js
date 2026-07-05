const assert = require("node:assert/strict");
const test = require("node:test");
const { buildIcsCalendar } = require("./calendarIcs");
const { calendarEventsFromInquiryDoc } = require("./adminCalendar");

const fakeDoc = (data) => ({
  id: "inquiry-1",
  data: () => data,
  updateTime: {
    toDate: () => new Date("2026-07-01T12:00:00Z"),
  },
});

test("builds calendar events with status, packages, and items", () => {
  const [event] = calendarEventsFromInquiryDoc(
    fakeDoc({
      name: "Alex Rivera",
      email: "alex@example.com",
      phoneNumber: "555-0100",
      status: "Confirmed",
      eventDetails: "Use side entrance.",
      events: [
        {
          id: "event-1",
          type: "Wedding",
          venue: "The Hall",
          date: "2026-07-18",
          startTime: "18:30",
          endTime: "23:00",
        },
      ],
      items: [
        {
          id: "pkg-1",
          name: "Gold Package",
          description: "DJ and lighting",
          categories: ["packages"],
          quantity: 1,
          price: 1500,
          eventAllocations: [{ eventId: "event-1", quantity: 1 }],
        },
        {
          id: "item-1",
          name: "Uplights",
          categories: ["addons"],
          quantity: 8,
          price: 35,
          eventAllocations: [{ eventId: "event-1", quantity: 8 }],
        },
      ],
    }),
    { appBaseUrl: "https://ormusicevents.com" }
  );

  assert.equal(event.summary, "Alex Rivera - Wedding [Confirmed]");
  assert.match(event.description, /Status: Confirmed/);
  assert.match(event.description, /Packages:\n- Gold Package x1/);
  assert.match(event.description, /Items:\n- Uplights x8/);
  assert.doesNotMatch(event.description, /\$/);
  assert.doesNotMatch(event.description, /DJ and lighting/);
  assert.doesNotMatch(event.description, /\(addons\)|\(packages\)/i);
  assert.doesNotMatch(event.description, /Use side entrance/);
  assert.equal(event.calendarStatus, "CONFIRMED");

  const calendar = buildIcsCalendar([event], {
    generatedAt: new Date("2026-07-02T12:00:00Z"),
  });

  assert.match(calendar, /SUMMARY:Alex Rivera - Wedding \[Confirmed\]/);
  assert.match(calendar, /STATUS:CONFIRMED/);
  assert.match(calendar, /LAST-MODIFIED:20260701T120000Z/);
  assert.match(calendar, /SEQUENCE:1782907200/);
});

test("maps pending inquiries to tentative calendar events", () => {
  const [event] = calendarEventsFromInquiryDoc(
    fakeDoc({
      name: "Sam Chen",
      status: "Pending",
      events: [{ id: "event-2", date: "2026-08-02" }],
    })
  );

  assert.equal(event.summary, "Sam Chen - Event [Pending]");
  assert.equal(event.calendarStatus, "TENTATIVE");
});
