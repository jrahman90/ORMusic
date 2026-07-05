import { buildIcsCalendar } from "./calendar";

describe("buildIcsCalendar", () => {
  it("creates a timed Apple Calendar compatible event", () => {
    const calendar = buildIcsCalendar(
      [
        {
          id: "event-1",
          inquiryId: "inquiry-1",
          clientName: "Alex Rivera",
          type: "Wedding",
          dateKey: "2026-07-18",
          startTime: "18:30",
          endTime: "23:00",
          venue: "The Hall, NYC",
          status: "Confirmed",
          email: "alex@example.com",
          serviceNames: ["DJ", "Lighting"],
          eventDetails: "Load in at side entrance.",
        },
      ],
      {
        generatedAt: new Date("2026-07-01T12:00:00Z"),
        getSourceUrl: () => "https://ormusicevents.com/dashboard-admin/events/inquiry-1/event-1",
      }
    );

    expect(calendar).toContain("BEGIN:VCALENDAR");
    expect(calendar).toContain("BEGIN:VEVENT");
    expect(calendar).toContain("DTSTART;TZID=America/New_York:20260718T183000");
    expect(calendar).toContain("DTEND;TZID=America/New_York:20260718T230000");
    expect(calendar).toContain("SUMMARY:Alex Rivera - Wedding");
    expect(calendar).toContain("LOCATION:The Hall\\, NYC");
    expect(calendar).toContain("Services: DJ\\, Lighting");
    expect(calendar).toContain("DTSTAMP:20260701T120000Z");
  });

  it("exports untimed events as all-day events", () => {
    const calendar = buildIcsCalendar([
      {
        id: "event-2",
        inquiryId: "inquiry-2",
        clientName: "Sam Chen",
        dateKey: "2026-08-02",
      },
    ]);

    expect(calendar).toContain("DTSTART;VALUE=DATE:20260802");
    expect(calendar).toContain("DTEND;VALUE=DATE:20260803");
  });
});
