# User Components

Customer-facing commerce and inquiry screens live here.

## Files

| File | Role |
| --- | --- |
| `Rentals.js` | Public service/rental catalog and add-to-cart UI |
| `Cart.js` | Cart review, contact/event intake, service allocation, inquiry submission |
| `UserInquiries.js` | Route wrapper for the customer inquiry portal |
| `PreviousInquiries.js` | Main customer inquiry portal with tabs, editing, contracts, payments, and itineraries |

## Customer Flow

1. Customer browses `/RentalItems`.
2. `Rentals` adds catalog items to `localStorage.cartItems`.
3. `App.js` hydrates cart state and passes it to `Cart`.
4. `Cart` collects customer info, notes, event dates, and per-event service allocation.
5. `Cart` writes an `inquiries` document with `status: "Processing"`.
6. Customer lands on `/inquiries`, rendered by `UserInquiries` and `PreviousInquiries`.

## Editing Rules

Customer edits in `PreviousInquiries` are allowed only when:

- the inquiry has no contracts, and
- the inquiry status is not `Completed`.

After a contract exists, admins own the authoritative edits.

## Shared Data Notes

- `items` are copied from the service catalog when the inquiry is created.
- `events` can contain multiple event dates.
- `eventAllocations` maps item quantities to event IDs.
- Customer and admin pages should use the same calculation rules for totals, fees, travel, tax, and deposits.
