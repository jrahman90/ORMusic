// utils/contracts.js
import { to12h, prettyDate } from "./formatters";

const money = (v) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    Number(v || 0)
  );

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/**
 * Build a clean, print-friendly HTML body for a contract using inquiry data.
 * - Nice spacing, cards, and readable tables
 * - Auto-populates client, events, items, and totals
 * - Null/undefined safe
 */
export function buildContractHtml(inquiryArg) {
  const inquiry = inquiryArg ?? {};

  const clientName = inquiry?.name || "Client";
  const clientEmail = inquiry?.email || "";
  const clientPhone = inquiry?.phoneNumber || "";

  const events = Array.isArray(inquiry?.events) ? inquiry.events : [];
  const items = Array.isArray(inquiry?.items) ? inquiry.items : [];

  // Whether any event has a venue field
  const hasVenue = events.some((ev) => !!ev?.venue);

  // Events table rows
  const eventRows =
    events.length > 0
      ? events
          .map((ev) => {
            const d = ev?.date ? prettyDate(ev.date) : "—";
            const t =
              ev?.startTime || ev?.endTime
                ? `${to12h(ev?.startTime || "00:00")} – ${to12h(
                    ev?.endTime || "00:00"
                  )}`
                : "—";
            const v = ev?.venue ? esc(ev.venue) : "—";
            return `<tr style="border-top:1px solid #edf0f2;">
              <td style="padding:.5rem;">${esc(ev?.type || "Event")}</td>
              <td style="padding:.5rem;">${esc(d)}</td>
              <td style="padding:.5rem;">${esc(t)}</td>
              ${hasVenue ? `<td style="padding:.5rem;">${v}</td>` : ""}
            </tr>`;
          })
          .join("")
      : `<tr style="border-top:1px solid #edf0f2;">
           <td colspan="${
             hasVenue ? 4 : 3
           }" style="padding:.6rem; color:#6c757d;">No events listed</td>
         </tr>`;

  // Items/services rows (show per-unit and line amount)
  const itemRows =
    items.length > 0
      ? items
          .map((it) => {
            const qty = Math.max(0, Number(it?.quantity || 0));
            const price = Number(it?.price || 0);
            const amount = qty * price;
            return `<tr style="border-top:1px solid #edf0f2;">
              <td style="padding:.5rem;">${esc(it?.name || "Item")}</td>
              <td style="padding:.5rem; text-align:right;">${qty}</td>
              <td style="padding:.5rem; text-align:right;">${money(price)}</td>
              <td style="padding:.5rem; text-align:right; font-weight:600;">${money(
                amount
              )}</td>
            </tr>`;
          })
          .join("")
      : `<tr style="border-top:1px solid #edf0f2;">
           <td colspan="4" style="padding:.6rem; color:#6c757d;">No items listed</td>
         </tr>`;

  // Totals (null-safe)
  const subtotal = items.reduce(
    (sum, it) =>
      sum + Number(it?.price || 0) * Math.max(0, Number(it?.quantity || 0)),
    0
  );

  const dType =
    inquiry?.discountType === "percent" || inquiry?.discountType === "amount"
      ? inquiry?.discountType
      : "amount";

  const dRaw =
    inquiry?.discountType === "percent"
      ? Number(inquiry?.discountValue || 0)
      : inquiry?.discount != null
      ? Number(inquiry?.discount || 0)
      : Number(inquiry?.discountValue || 0) || 0;

  const discountApplied =
    dType === "percent"
      ? Math.max(0, Math.min(100, dRaw)) * 0.01 * subtotal
      : Math.max(0, dRaw);

  const baseAfterDiscount = Math.max(0, subtotal - discountApplied);

  const fType =
    inquiry?.feeType === "percent" || inquiry?.feeType === "amount"
      ? inquiry?.feeType
      : "amount";
  const fRaw = Number(inquiry?.feeValue || 0);

  const feeApplied =
    fType === "percent"
      ? Math.max(0, Math.min(100, fRaw)) * 0.01 * baseAfterDiscount
      : Math.max(0, fRaw);

  const travel = Math.max(0, Number(inquiry?.travelAmount || 0));
  const taxPercent = Math.max(
    0,
    Math.min(100, Number(inquiry?.taxPercent || 0))
  );
  const taxApplied = taxPercent * 0.01 * baseAfterDiscount;

  const total = Math.max(
    0,
    baseAfterDiscount + feeApplied + travel + taxApplied
  );

  const generatedAt = new Date().toLocaleString();

  return `
  <div style="
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
    line-height:1.55; color:#212529; font-size:16px;">
    
    <!-- Header -->
    <div style="margin-bottom:14px;">
      <div style="font-size:24px; font-weight:700; letter-spacing:.2px;">
        OR Music Events: Services Agreement
      </div>
      <div style="font-size:13px; color:#6c757d;">Generated on ${esc(
        generatedAt
      )}</div>
    </div>

    <!-- Client card -->
    <div style="border:1px solid #e9ecef; border-radius:12px; padding:12px 14px; background:#fff;">
      <div style="font-weight:700; margin-bottom:6px;">Client</div>
      <table style="width:100%; border-collapse:collapse; font-size:15px;">
        <tr>
          <td style="width:120px; color:#6c757d; padding:.25rem 0;">Name</td>
          <td style="padding:.25rem 0;">${esc(clientName)}</td>
        </tr>
        <tr>
          <td style="color:#6c757d; padding:.25rem 0;">Email</td>
          <td style="padding:.25rem 0;">${esc(clientEmail)}</td>
        </tr>
        <tr>
          <td style="color:#6c757d; padding:.25rem 0;">Phone</td>
          <td style="padding:.25rem 0;">${esc(clientPhone)}</td>
        </tr>
      </table>
    </div>

    <!-- Events -->
    <div style="margin-top:14px; border:1px solid #e9ecef; border-radius:12px; overflow:hidden; background:#fff;">
      <div style="padding:10px 14px; font-weight:700; border-bottom:1px solid #edf0f2; background:#f8f9fa;">
        Event details
      </div>
      <table style="width:100%; border-collapse:collapse; font-size:15px;">
        <thead style="background:#fcfcfd;">
          <tr>
            <th style="text-align:left; padding:.6rem 14px; color:#6c757d; font-weight:600;">Type</th>
            <th style="text-align:left; padding:.6rem 14px; color:#6c757d; font-weight:600;">Date</th>
            <th style="text-align:left; padding:.6rem 14px; color:#6c757d; font-weight:600;">Time</th>
            ${
              hasVenue
                ? `<th style="text-align:left; padding:.6rem 14px; color:#6c757d; font-weight:600;">Venue</th>`
                : ""
            }
          </tr>
        </thead>
        <tbody>
          ${eventRows.replaceAll(/<td>/g, '<td style="padding:.6rem 14px;">')}
        </tbody>
      </table>
    </div>

    <!-- Items/Services -->
    <div style="margin-top:14px; border:1px solid #e9ecef; border-radius:12px; overflow:hidden; background:#fff;">
      <div style="padding:10px 14px; font-weight:700; border-bottom:1px solid #edf0f2; background:#f8f9fa;">
        Equipment and services
      </div>
      <table style="width:100%; border-collapse:collapse; font-size:15px;">
        <thead style="background:#fcfcfd;">
          <tr>
            <th style="text-align:left; padding:.6rem 14px; color:#6c757d; font-weight:600;">Item</th>
            <th style="text-align:right; padding:.6rem 14px; color:#6c757d; font-weight:600; width:90px;">Qty</th>
            <th style="text-align:right; padding:.6rem 14px; color:#6c757d; font-weight:600; width:120px;">Unit</th>
            <th style="text-align:right; padding:.6rem 14px; color:#6c757d; font-weight:600; width:140px;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows
            .replaceAll(/<td /g, "<td ")
            .replaceAll(
              /style="padding:\.5rem; /g,
              'style="padding:.6rem 14px; '
            )}
        </tbody>
      </table>
    </div>

    <!-- Totals -->
    <div style="margin-top:14px; display:flex; justify-content:flex-end;">
      <table style="min-width:360px; border:1px solid #e9ecef; border-radius:12px; overflow:hidden; background:#fff;">
        <tbody>
          <tr>
            <td style="padding:.6rem 14px; color:#6c757d;">Subtotal</td>
            <td style="padding:.6rem 14px; text-align:right;">${money(
              subtotal
            )}</td>
          </tr>
          ${
            discountApplied > 0
              ? `<tr>
                   <td style="padding:.6rem 14px; color:#6c757d;">Discount</td>
                   <td style="padding:.6rem 14px; text-align:right;">-${money(
                     discountApplied
                   )}</td>
                 </tr>`
              : ""
          }
          ${
            feeApplied > 0
              ? `<tr>
                   <td style="padding:.6rem 14px; color:#6c757d;">Processing fee</td>
                   <td style="padding:.6rem 14px; text-align:right;">${money(
                     feeApplied
                   )}</td>
                 </tr>`
              : ""
          }
          ${
            travel > 0
              ? `<tr>
                   <td style="padding:.6rem 14px; color:#6c757d;">Travel</td>
                   <td style="padding:.6rem 14px; text-align:right;">${money(
                     travel
                   )}</td>
                 </tr>`
              : ""
          }
          ${
            taxApplied > 0
              ? `<tr>
                   <td style="padding:.6rem 14px; color:#6c757d;">Tax</td>
                   <td style="padding:.6rem 14px; text-align:right;">${money(
                     taxApplied
                   )}</td>
                 </tr>`
              : ""
          }
          <tr>
            <td style="padding:.7rem 14px; font-weight:700; border-top:1px solid #edf0f2;">Total</td>
            <td style="padding:.7rem 14px; text-align:right; font-weight:700; border-top:1px solid #edf0f2;">${money(
              total
            )}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Terms -->
    <div style="margin-top:14px; border:1px solid #e9ecef; border-radius:12px; padding:12px 14px; background:#fff;">
      <div style="font-weight:700; margin-bottom:6px;">Terms</div>
      <div style="font-size:15px; color:#343a40; margin-bottom:.5rem;">
        ${esc(
          clientName
        )} will pay a deposit upon signing this contract, which may be more or less than
        50% of the contract amount. This deposit is non-refundable. ${esc(
          clientName
        )} will pay the balance at least 7 days before the date of the event.
      </div>
      <div style="font-size:15px; color:#343a40; margin-bottom:.5rem;">
        If ${esc(
          clientName
        )} wishes to cancel the services, they must give OR MUSIC EVENTS at least 30 days’ notice.
        Any cancellation after that point will result in forfeiture of deposit and balance due immediately.
        Payments may be made via cash, money order, or direct deposit.
      </div>
      <div style="font-size:15px; color:#343a40; margin-bottom:.5rem; font-weight:600;">
        * ALL BALANCES MUST BE CLEARED AT LEAST 7 DAYS BEFORE THE EVENT DATE *
      </div>
      <div style="font-size:15px; color:#343a40; margin-bottom:.5rem;">
        OR MUSIC EVENTS will require ${esc(
          clientName
        )} and/or venue to provide proper electrical source, chairs, and a 6–8ft table.
        Itinerary for the event must be provided 7 days before the event date. OR Music Events is not liable for any mishaps
        if the itinerary is not provided in the specified time.
      </div>

      <div style="font-weight:700; margin:.5rem 0 .3rem;">Music</div>
      <div style="font-size:15px; color:#343a40; margin-bottom:.5rem;">
        OR MUSIC EVENTS will play songs chosen by ${esc(
          clientName
        )} or from a general set list. Requests from ${esc(
    clientName
  )} and/or guests will be accommodated when available and when time permits.
      </div>

      <div style="font-weight:700; margin:.5rem 0 .3rem;">Damages</div>
      <div style="font-size:15px; color:#343a40; margin-bottom:.5rem;">
        ${esc(
          clientName
        )} agrees to pay for all damages to OR MUSIC EVENTS equipment caused by the negligence of
        ${esc(clientName)}, any event guests, or other vendors hired by ${esc(
    clientName
  )} and/or the venue.
        ${esc(
          clientName
        )} must inspect the equipment prior to the start of the event to ensure it is in working order.
      </div>

      <div style="font-size:15px; color:#343a40; font-style:italic;">
        If the event is cancelled due to a pandemic, the client will have one year from the contract date to rebook OR Music Events
        and apply the deposit to another event (rate differences may apply). If the service provider is unable to attend the event
        due to unforeseen circumstances, OR Music Events will provide a replacement service provider.
      </div>
    </div>

    <div style="margin-top:12px; font-size:13px; color:#6c757d;">
      By signing, I acknowledge that I have read and agree to the terms above.
    </div>
  </div>
  `;
}
