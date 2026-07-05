# Architecture

This app is a single Create React App frontend backed directly by Firebase. There is no custom server in this repository.

## Runtime Stack

- React 18 with React Router v6.
- React Bootstrap and Bootstrap for layout and form controls.
- `lucide-react` and `react-icons` for icons.
- Firebase Auth for sign in/sign up.
- Firestore for business data.
- Firebase Storage for uploaded rental/service and team media.
- Workbox service worker registered from `src/index.js`.
- Netlify SPA redirect in `netlify.toml`.

## Entry Points

- `src/index.js` mounts the app inside `BrowserRouter`, imports global styles, registers the service worker, and reports web vitals.
- `src/App.js` owns top-level routes, SEO meta tags, local cart state, and admin route registration.
- `src/Components/Navbar.js` owns desktop navigation, mobile tab bar, account modal entry, cart count badge, processing inquiry badge, and admin/customer view toggle.

## Routing and Access

`App.js` reads `users/{uid}` after Firebase Auth changes. If that document has `isAdmin: true`, admin routes are added to the route tree.

Admin route gating is client-side only. Firestore security rules must still protect admin data and writes in production.

Admin navigation is independently controlled in `Navbar.js`. Admins can switch between:

- `admin` view: shows admin dropdown and dashboard mobile tab.
- `customer` view: hides admin nav and shows customer links.

The selected view is stored in `localStorage.adminViewMode`.

## Major Feature Areas

### Public Website

Files directly under `src/Components` are mostly public pages:

- `Home.js`
- `ContactUs.js`
- `Djmc.js`
- `Downloads.js`
- `Music.js`
- `MusicVideos.js`
- `EventureTerms.js`
- `Footer.js`
- `Navbar.js`

These should stay lightweight. Data-backed public pages currently read from Firestore collections such as `artists`, `rentals`, and `videos`.

### Services and Inquiry Submission

Customer flow:

1. `Rentals` reads the `rentals` collection and lets a customer add services/rentals to `localStorage.cartItems`.
2. `App.js` hydrates and persists cart state, then passes it into `Cart`.
3. `Cart` collects contact info, event dates, notes, and event allocations.
4. `Cart` creates a new `inquiries` document with `status: "Processing"`.
5. After submit, the customer is sent to `/inquiries`.

Important files:

- `src/Components/UserComponents/Rentals.js`
- `src/Components/UserComponents/Cart.js`
- `src/Components/UserComponents/UserInquiries.js`
- `src/Components/UserComponents/PreviousInquiries.js`

### Customer Inquiry Portal

`UserInquiries` is a wrapper around `PreviousInquiries`.

`PreviousInquiries` handles:

- loading inquiries for the signed-in user.
- showing tabs for overview, events, services, payments, contracts, and itinerary.
- customer edits before a contract exists.
- blocking edits after a contract exists or when the inquiry is completed.
- client-side contract review/signature through `ContractModal`.

If adding new editable inquiry fields, update both the customer portal and the admin pages that read the same fields.

### Admin Dashboard

`AdminDashboard` turns every inquiry event date into a calendar event. It shows:

- status filters and counts.
- month calendar.
- mobile agenda/calendar handling.
- create inquiry modal.
- processing/pending queue with pending-days badge.
- event service names on mobile cards.

The event details route is built as:

```text
/dashboard-admin/events/:inquiryId/:eventId
```

### Admin Event Details

`AdminEventDetails` is the focused event workspace. It loads a single inquiry document, normalizes the embedded `events` array, finds the selected `eventId`, and renders tabs:

- Overview
- Services
- Payments
- Contracts
- Itinerary
- Activity

This page intentionally overlaps with the legacy admin inquiries page, but gives admins a cleaner event-by-event workflow.

### Legacy Admin Inquiries

`Inquiries` is the larger all-in-one admin inquiry manager. It still owns several broad edit workflows and is useful for bulk/full inquiry management.

Keep it available until the event details page fully replaces every admin workflow.

### Catalog Admin

`RentalsAdmin` edits the `rentals` collection and uploads media to Firebase Storage under `rentals/{docId}/...`.

Despite the historical name, this collection now represents both packages and rental items. Category values are used by the UI to separate packages, rentals, and other catalog items.

### Contracts

Contracts are embedded in each inquiry document as `contracts`.

- `utils/contracts.js` builds printable contract HTML from the inquiry.
- `ContractModal` creates contracts and stores admin/client signatures as data URLs.
- Contract existence locks customer edits to inquiry details.

### Itineraries

Itineraries are embedded on the event object:

```text
inquiries/{inquiryId}.events[].itinerary
```

`ItineraryEditorPage` allows access for admins and the inquiry owner, but editing depends on the inquiry status being confirmed.

`ItineraryPrintPage` supports normal authenticated print view and public token view.

## Styling

Global style files:

- `src/index.css`: base/global styles.
- `src/App.css`: app-level styles.
- `src/Components/Css/components.css`: most shared component, admin, customer, dashboard, tab, and responsive styles.
- `src/Components/Css/contactForm.css`: contact form-specific styles.
- `src/Components/Css/pictures.css`: image/gallery styles.

When adding a new feature, prefer colocating style names by feature prefix in `components.css` unless the feature already has a smaller dedicated stylesheet.

## Where To Make Common Changes

Add a customer-facing page:

1. Create the page under `src/Components` or `src/Components/UserComponents`.
2. Add a route in `src/App.js`.
3. Add navigation in `src/Components/Navbar.js` if it should be discoverable.
4. Add SEO metadata in `SEO_CONFIG` inside `src/App.js` if the route is public.

Add an admin tool:

1. Create the component under `src/Components/Admin`.
2. Add an `isAdmin` gated route in `src/App.js`.
3. Add the link to `adminLinks` in `src/Components/Navbar.js`.
4. Document any new Firestore collection or fields in `docs/FIRESTORE_MODEL.md`.

Add or change inquiry fields:

1. Update submit payloads in `Cart.js` and/or manual admin creation.
2. Update display/editing in `AdminDashboard`, `AdminEventDetails`, `Inquiries`, and `PreviousInquiries` as needed.
3. Update contract generation if the field belongs in contracts.
4. Update `docs/FIRESTORE_MODEL.md`.

Add service/rental fields:

1. Update `RentalsAdmin` create/edit forms.
2. Update `Rentals` customer display/cart serialization.
3. Update inquiry item copy/allocation logic in `Cart`, `AdminEventDetails`, `Inquiries`, and `PreviousInquiries` if needed.

## Development Notes

- Use `npm run build` as the main compile check.
- `npm test` is configured through Create React App, but the current project has minimal test coverage.
- The app stores some transient customer state in `localStorage`, especially `cartItems` and admin view mode.
- Because the service worker is registered, production changes may require users to close all open tabs before they see a new precached build.
