# OR Music Events

React/Firebase web app for OR Music Events. It includes the public website, rental/service cart, customer inquiry portal, admin dashboard, event details, contracts, deposits, and itineraries.

## Quick Start

```bash
npm install
npm start
```

Useful scripts:

```bash
npm run build
npm test
```

The app is built with Create React App, React Router, React Bootstrap, Firebase Auth, Firestore, Firebase Storage, Workbox service workers, and Netlify SPA redirects.

## Source Map

```text
public/                         Static images, manifest, sitemap, robots.txt
src/App.js                      Top-level routing, SEO meta handling, cart state, admin route gate
src/index.js                    React entry point and service worker registration
src/api/firestore/              Firebase app, Firestore, Storage, and Auth exports
src/Components/                 Page and feature components
src/Components/Admin/           Admin dashboard, inquiries, services, media, team editors
src/Components/UserComponents/  Customer rentals, cart, and inquiry portal
src/Components/Itineraries/     Event itinerary editor and printable/public views
src/Components/contracts/       Contract modal and signature capture
src/Components/Css/             Shared app, admin, customer, and feature styling
src/utils/                      Shared formatting and contract HTML helpers
docs/                           Architecture and Firestore/data model notes
```

Generated folders such as `node_modules/` and `build/` are not source of truth.

## Main Routes

Public/customer routes are available to everyone unless the page itself requires a signed-in user:

| Route | Component | Purpose |
| --- | --- | --- |
| `/` | `Home` | Public landing page |
| `/contact` | `ContactUs` | Contact page and rental/service prompt |
| `/DJMC` | `Djmc` | Public team page |
| `/RentalItems` | `Rentals` | Browse services/rentals and add to cart |
| `/Cart` | `Cart` | Review services and submit an inquiry |
| `/inquiries` | `UserInquiries` | Customer inquiry portal |
| `/inquiries/:inquiryId/events/:eventId/itinerary` | `ItineraryEditorPage` | Event itinerary editor |
| `/inquiries/:inquiryId/events/:eventId/itinerary/print` | `ItineraryPrintPage` | Printable itinerary |
| `/itinerary/public/:inquiryId/:eventId/:token` | `ItineraryPrintPage publicView` | Public itinerary view |
| `/MusicVideos` | `MusicVideos` | Public video gallery |
| `/Music` | `Music` | Public music page |
| `/eventure-terms-conditions` | `EventureTermsAndConditions` | Eventure terms/contact form |

Admin routes are only registered when `users/{uid}.isAdmin` is truthy:

| Route | Component | Purpose |
| --- | --- | --- |
| `/dashboard-admin` | `AdminDashboard` | Calendar, status counts, create inquiry, processing/pending queue |
| `/dashboard-admin/events/:inquiryId/:eventId` | `AdminEventDetails` | Admin event workspace with Overview, Services, Payments, Contracts, Itinerary, Activity tabs |
| `/inquiries-admin` | `Inquiries` | Legacy/full inquiry management page |
| `/rental-items-admin` | `RentalsAdmin` | Service/rental catalog editor |
| `/music-video-admin` | `MusicVideoAdmin` | Video embed editor |
| `/dj-mc-admin` | `DjmcAdmin` | Team/artist editor |
| `/eventure-admin` | `EventureAdmin` | Eventure contact review |

## Core Concepts

- `inquiries` is the primary business collection. One inquiry can contain multiple event dates in `events`, multiple service/rental rows in `items`, contracts, deposits, notes, totals, and itinerary data.
- Services and rentals come from the `rentals` collection. Admins maintain this catalog in `RentalsAdmin`; customers browse it in `Rentals`.
- Admin access is controlled by Firestore user documents, not by a hardcoded email list.
- Admins can toggle the navigation into customer view. This hides admin navigation but does not remove the underlying admin permission.
- Customer inquiry editing is allowed only before a contract exists and only while the inquiry is not completed.
- The service worker is registered in `src/index.js`; production builds may cache aggressively until open tabs are closed.

## Deeper Docs

- [Architecture](docs/ARCHITECTURE.md)
- [Firestore Data Model](docs/FIRESTORE_MODEL.md)
- [SEO Notes](docs/SEO.md)
- [Component Folder Guide](src/Components/README.md)
- [Firebase Setup Notes](src/api/firestore/README.md)

## Deployment

`netlify.toml` rewrites all routes to `index.html`, which lets React Router handle deep links such as `/dashboard-admin/events/...`.

Run `npm run build` before shipping changes. The current build may warn that Browserslist `caniuse-lite` is outdated; that warning does not block compilation.
