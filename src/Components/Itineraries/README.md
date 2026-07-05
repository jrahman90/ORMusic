# Itineraries

Itinerary data is embedded on an event inside an inquiry:

```text
inquiries/{inquiryId}.events[].itinerary
```

This keeps each event date independent when an inquiry has multiple days.

## Files

| File | Role |
| --- | --- |
| `ItineraryEditorPage.js` | Authenticated editor for admins and the inquiry owner |
| `InquiryItineraries.js` | Customer inquiry portal section that links to itineraries |
| `ItineraryPrintPage.js` | Printable view and public token view |

## Access Rules in UI

- Admins can access itinerary pages.
- Customers can access itineraries for inquiries where `inquiry.userId` matches their auth UID.
- Editing depends on confirmed inquiry status.
- Public itinerary view uses `/itinerary/public/:inquiryId/:eventId/:token`.

Firestore security rules should enforce these rules server-side.
