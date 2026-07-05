# Components Folder Guide

`src/Components` contains both page-level screens and feature components. Historical naming is mixed, so use this map before adding files.

## Top-Level Components

| File | Role |
| --- | --- |
| `Navbar.js` | Desktop nav, mobile tab bar, auth modal trigger, cart badge, admin/customer view toggle |
| `Footer.js` | Site footer and social links |
| `Home.js` | Public home page |
| `ContactUs.js` | Public contact page |
| `Djmc.js` | Public team page |
| `MusicVideos.js` | Public video gallery |
| `Music.js` | Public music page |
| `Downloads.js` | Downloads page |
| `EventureTerms.js` | Eventure terms and contact form |
| `AccountModal.js` | Login/signup modal and `users/{uid}` profile creation |
| `404.js` | Fallback route |

## Subfolders

| Folder | Role |
| --- | --- |
| `Admin/` | Admin-only pages and editors |
| `UserComponents/` | Customer cart, services, and inquiry portal |
| `Itineraries/` | Event itinerary editor and print/public views |
| `contracts/` | Contract modal and signature capture |
| `Css/` | Shared stylesheets |
| `HomeComponents/` | Smaller home page sections |
| `SubElements/` | Small reusable/legacy visual pieces |

## Naming Guidance

- Public customer pages should use public names such as `Djmc`, `Rentals`, or `UserInquiries`.
- Admin pages should include `Admin` in the component name and file name.
- If a component is routed directly from `App.js`, prefer one default export whose name matches the file.
- Keep large shared business helpers in `src/utils` when they are used across admin and customer screens.

## Styling Guidance

Most current feature styles live in `Css/components.css`. Use clear class prefixes for new areas, for example:

- `admin-dashboard-*`
- `admin-event-*`
- `customer-inquiry-*`
- `mobile-tab*`

This keeps the shared stylesheet searchable.
