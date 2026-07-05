# Firestore Data Model

This document describes the fields the current UI reads and writes. Firestore is schemaless, so treat this as the application contract.

## Collections

| Collection | Primary files | Purpose |
| --- | --- | --- |
| `users` | `AccountModal`, `App`, `Navbar`, admin assign flows | Auth profile and admin flag |
| `inquiries` | `Cart`, `PreviousInquiries`, `AdminDashboard`, `AdminEventDetails`, `Inquiries`, itineraries, contracts | Core customer/admin event workflow |
| `rentals` | `Rentals`, `RentalsAdmin`, admin service editors | Service, package, and rental catalog |
| `artists` | `Djmc`, `DjmcAdmin` | Public team members and admin team editor |
| `videos` | `MusicVideos`, `MusicVideoAdmin` | Public music video embeds |
| `EventureContact` | `EventureTerms`, `EventureAdmin` | Eventure contact submissions |

## `users/{uid}`

Created in `AccountModal` when a customer signs up.

```js
{
  name: string,
  email: string,
  phoneNumber: string,
  isAdmin: boolean,
  createdAt: serverTimestamp()
}
```

Admin access depends on `isAdmin`.

## `inquiries/{inquiryId}`

Primary inquiry/event record. Created by customer checkout in `Cart` or manually by admin pages.

Common fields:

```js
{
  userId: string,
  userName: string,
  userEmail: string,
  name: string,
  email: string,
  phoneNumber: string,
  eventDetails: string,
  status: "Processing" | "Pending" | "Approved" | "Confirmed" | "Rejected" | "Cancelled" | "Completed",
  timestamp: serverTimestamp(),
  updatedAt: serverTimestamp(),
  source: "manual",

  events: Event[],
  items: InquiryItem[],
  deposits: Deposit[],
  contracts: Contract[],

  discountType: "amount" | "percent",
  discountValue: number,
  discount: number,
  feeType: "amount" | "percent",
  feeValue: number,
  travelAmount: number,
  taxPercent: number
}
```

Not every field exists on every document. UI code is defensive and supplies defaults.

### Status Values

Current UI recognizes:

- `Processing`
- `Pending`
- `Approved`
- `Confirmed`
- `Rejected`
- `Cancelled`
- `Completed`

`Confirmed` unlocks itinerary editing. `Completed` locks customer editing.

Customer inquiry editing is allowed only when:

- the inquiry has no contracts, and
- `status` is not `Completed`.

### Embedded `Event`

Stored in `inquiries/{inquiryId}.events`.

```js
{
  id: string,
  type: string,
  venue: string,
  date: "YYYY-MM-DD",
  startTime: "HH:mm",
  endTime: "HH:mm",
  itinerary: Itinerary
}
```

Older documents may not have `id`; UI normalizes them to `event-{index}`. New code should always create a stable `id` with `crypto.randomUUID()` when possible.

### Embedded `InquiryItem`

Stored in `inquiries/{inquiryId}.items`. These are copies of catalog items at the time of inquiry, not live references to the `rentals` collection.

```js
{
  id: string,
  name: string,
  description: string,
  price: number,
  quantity: number,
  categories: string[],
  media: Media[],

  eventId: string,
  eventAllocations: [
    {
      eventId: string,
      quantity: number
    }
  ]
}
```

Allocation rules:

- `eventAllocations` is the preferred format for multi-event inquiries.
- `eventId` is the older single-event assignment field.
- If an inquiry has one event and an item has no assignment, the UI treats the item as belonging to that single event.
- If total allocated quantity is less than `quantity`, the remainder is displayed as unassigned/general.

### Embedded `Deposit`

Stored in `inquiries/{inquiryId}.deposits`.

```js
{
  id: string,
  amount: number,
  note: string,
  date: number | string | Date | FirestoreTimestamp
}
```

Totals display deposits separately from service totals, then compute balance after deposits.

### Embedded `Contract`

Stored in `inquiries/{inquiryId}.contracts`.

```js
{
  id: string,
  title: string,
  html: string,
  createdAt: number,
  createdBy: "admin",
  adminSignature: string | null,
  adminSignedAt: number | null,
  clientSignature: string | null,
  clientSignedAt: number | null
}
```

Signatures are stored as data URLs. Contract creation and signing update the whole `contracts` array.

### Embedded `Itinerary`

Stored on one event:

```text
inquiries/{inquiryId}.events[].itinerary
```

The exact itinerary object is built in `ItineraryEditorPage` from the inquiry and event. Keep new itinerary fields inside the selected event so each event date can have its own schedule.

## `rentals/{rentalId}`

Catalog item used by customer services/rentals and admin catalog management.

```js
{
  name: string,
  description: string,
  price: number,
  categories: string[],
  media: Media[],
  createdAt: number
}
```

`categories` drives grouping in admin and customer UIs. The current UI treats package and rental separation as category-driven.

Media is uploaded to Firebase Storage:

```text
rentals/{rentalId}/{timestamp}_{filename}
```

Media shape:

```js
{
  url: string,
  path: string,
  type: "image" | "video"
}
```

## `artists/{artistId}`

Team member used on the public DJ/MC page and edited in the admin team page.

```js
{
  name: string,
  description: string,
  imageUrl: string,
  number: number
}
```

Admin ordering writes `number` values with a Firestore batch.

## `videos/{videoId}`

Music video embed data.

```js
{
  src: string,
  title: string,
  DateId: string,
  videoNumber: number
}
```

## `EventureContact/{contactId}`

Contact form submission from the Eventure terms page.

```js
{
  name: string,
  email: string,
  message: string,
  createdAt: Timestamp,
  status: string
}
```

`EventureAdmin` can update contact status.

## Field Change Checklist

When adding fields to one of these shapes, update:

- creation path.
- admin read/edit path.
- customer read/edit path.
- contract HTML generation if contracts should include the field.
- Firestore security rules outside this repo.
- this document.
