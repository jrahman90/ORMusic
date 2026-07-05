# Admin Components

Admin pages are route-gated in `src/App.js` with the `isAdmin` value loaded from `users/{uid}.isAdmin`.

## Files

| File | Role |
| --- | --- |
| `AdminDashboard.js` | Calendar/status dashboard, create inquiry modal, processing/pending queue |
| `AdminEventDetails.js` | Focused event workspace with Overview, Services, Payments, Contracts, Itinerary, Activity tabs |
| `Inquiries.js` | Legacy/full admin inquiry manager |
| `RentalsAdmin.js` | Service/rental catalog editor with Firebase Storage uploads |
| `DjmcAdmin.js` | Team/artist editor with drag sorting |
| `MusicVideoAdmin.js` | Video embed editor |
| `EventureAdmin.js` | Eventure contact review/status editor |

## Inquiry Admin Pages

There are currently two admin inquiry experiences:

- `AdminDashboard` plus `AdminEventDetails` is the newer event-first workflow.
- `Inquiries` is the older full inquiry manager and still contains broad edit/add workflows.

When adding or changing inquiry behavior, check both paths unless the change is intentionally limited to one workflow.

## Shared Inquiry Assumptions

- Inquiry status values are `Processing`, `Pending`, `Approved`, `Confirmed`, `Rejected`, `Cancelled`, and `Completed`.
- One inquiry can have multiple event dates in `events`.
- Services are stored in `items`.
- Multi-event service assignment should use `eventAllocations`.
- Contracts and deposits are embedded arrays on the inquiry document.

## Adding an Admin Page

1. Add the component in this folder.
2. Add an `isAdmin` gated route in `src/App.js`.
3. Add a link in `adminLinks` in `src/Components/Navbar.js`.
4. Update `docs/ARCHITECTURE.md` and `docs/FIRESTORE_MODEL.md` if the page introduces a new workflow or collection.
