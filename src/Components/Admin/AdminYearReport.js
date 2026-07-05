import React, { useEffect, useMemo, useState } from "react";
import { Badge, Button, Col, Container, Form, Row, Spinner } from "react-bootstrap";
import { Link } from "react-router-dom";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import {
  BarChart3,
  CalendarDays,
  DollarSign,
  Download,
  PackageCheck,
  ReceiptText,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import db from "../../api/firestore/firestore";

const STATUS_OPTIONS = [
  "Processing",
  "Pending",
  "Approved",
  "Confirmed",
  "Rejected",
  "Cancelled",
  "Completed",
];

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const REVENUE_BASIS_OPTIONS = [
  { value: "active", label: "Active bookings" },
  { value: "closed", label: "Confirmed + Completed" },
  { value: "all", label: "All inquiries" },
];

const money = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const preciseMoney = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(value || 0));

const formatNumber = (value) =>
  new Intl.NumberFormat("en-US").format(Number(value || 0));

const formatQuantity = (value) => {
  const number = Number(value || 0);
  if (Number.isInteger(number)) return formatNumber(number);
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
  }).format(number);
};

const coerceDate = (value) => {
  if (!value) return null;
  if (typeof value?.toDate === "function") {
    const date = value.toDate();
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const raw = String(value || "").trim();
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const statusClass = (status = "Processing") =>
  `status-${String(status || "Processing")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")}`;

const statusAllowed = (status, basis) => {
  if (basis === "all") return true;
  if (basis === "closed") {
    return status === "Confirmed" || status === "Completed";
  }
  return status !== "Rejected" && status !== "Cancelled";
};

const calcTotals = (inquiry = {}) => {
  const items = Array.isArray(inquiry.items) ? inquiry.items : [];
  const subtotal = items.reduce(
    (sum, item) =>
      sum + Number(item.price || 0) * Math.max(0, Number(item.quantity || 0)),
    0
  );
  const discountType =
    inquiry.discountType === "percent" || inquiry.discountType === "amount"
      ? inquiry.discountType
      : "amount";
  const discountRaw =
    inquiry.discountType === "percent"
      ? Number(inquiry.discountValue || 0)
      : inquiry.discount != null
      ? Number(inquiry.discount || 0)
      : Number(inquiry.discountValue || 0) || 0;
  const discountApplied =
    discountType === "percent"
      ? Math.max(0, Math.min(100, discountRaw)) * 0.01 * subtotal
      : Math.max(0, discountRaw);
  const baseAfterDiscount = Math.max(0, subtotal - discountApplied);
  const feeType =
    inquiry.feeType === "percent" || inquiry.feeType === "amount"
      ? inquiry.feeType
      : "amount";
  const feeRaw = Number(inquiry.feeValue || 0);
  const feeApplied =
    feeType === "percent"
      ? Math.max(0, Math.min(100, feeRaw)) * 0.01 * baseAfterDiscount
      : Math.max(0, feeRaw);
  const travel = Math.max(0, Number(inquiry.travelAmount || 0));
  const taxPercent = Math.max(0, Math.min(100, Number(inquiry.taxPercent || 0)));
  const taxApplied = taxPercent * 0.01 * baseAfterDiscount;
  const total = Math.max(
    0,
    baseAfterDiscount + feeApplied + travel + taxApplied
  );

  return {
    subtotal,
    discountApplied,
    feeApplied,
    travel,
    taxApplied,
    total,
  };
};

const sumDeposits = (inquiry = {}) =>
  (Array.isArray(inquiry.deposits) ? inquiry.deposits : []).reduce(
    (sum, deposit) => sum + Number(deposit?.amount || 0),
    0
  );

const normalizeEvents = (inquiry = {}) => {
  const events = Array.isArray(inquiry.events) ? inquiry.events : [];
  if (events.length > 0) {
    return events.map((event, index) => ({
      ...event,
      id: event?.id || `event-${index}`,
    }));
  }

  const legacyDate = inquiry.date || inquiry.eventDate || "";
  if (!legacyDate && !inquiry.eventType && !inquiry.venue) return [];

  return [
    {
      id: "event-0",
      type: inquiry.eventType || inquiry.type || "Event",
      venue: inquiry.venue || "",
      date: legacyDate,
      startTime: inquiry.startTime || "",
      endTime: inquiry.endTime || "",
    },
  ];
};

const getDatedEvents = (inquiry = {}) =>
  normalizeEvents(inquiry)
    .map((event) => ({
      ...event,
      dateObject: coerceDate(event.date),
    }))
    .filter((event) => event.dateObject);

const normalizeAllocations = (item = {}, events = []) => {
  const eventIds = new Set(events.map((event) => event.id));
  const totalQty = Math.max(0, Number(item?.quantity || 0));
  const raw = Array.isArray(item?.eventAllocations)
    ? item.eventAllocations
    : [];
  const allocations = raw
    .map((row) => ({
      eventId: row?.eventId || "",
      quantity: Math.max(0, Number(row?.quantity || 0)),
    }))
    .filter((row) => row.quantity > 0 && eventIds.has(row.eventId));

  if (allocations.length === 0 && item?.eventId && eventIds.has(item.eventId)) {
    return [{ eventId: item.eventId, quantity: totalQty }];
  }

  const capped = [];
  let used = 0;
  allocations.forEach((row) => {
    const remaining = Math.max(0, totalQty - used);
    const quantity = Math.min(row.quantity, remaining);
    if (quantity > 0) {
      capped.push({ ...row, quantity });
      used += quantity;
    }
  });
  return capped;
};

const categoryForItem = (item = {}) => {
  const categories = Array.isArray(item.categories) ? item.categories : [];
  if (categories.includes("packages")) return "Packages";
  if (categories.includes("addons")) return "Rentals and add-ons";
  return "Other";
};

const buildEventLineTotals = (inquiry = {}, events = []) => {
  const eventTotals = new Map(events.map((event) => [event.id, 0]));
  if (events.length === 0) return eventTotals;

  (Array.isArray(inquiry.items) ? inquiry.items : []).forEach((item) => {
    const quantity = Math.max(0, Number(item.quantity || 0));
    const price = Number(item.price || 0);
    const lineTotal = quantity * price;
    if (lineTotal <= 0) return;

    const allocations = normalizeAllocations(item, events);
    if (allocations.length > 0) {
      let assigned = 0;
      allocations.forEach((row) => {
        const value = row.quantity * price;
        eventTotals.set(row.eventId, (eventTotals.get(row.eventId) || 0) + value);
        assigned += row.quantity;
      });

      const remaining = Math.max(0, quantity - assigned);
      if (remaining > 0) {
        const value = (remaining * price) / events.length;
        events.forEach((event) => {
          eventTotals.set(event.id, (eventTotals.get(event.id) || 0) + value);
        });
      }
      return;
    }

    const value = lineTotal / events.length;
    events.forEach((event) => {
      eventTotals.set(event.id, (eventTotals.get(event.id) || 0) + value);
    });
  });

  return eventTotals;
};

const addProduct = (productMap, item, quantity) => {
  const qty = Number(quantity || 0);
  if (qty <= 0) return;

  const name = String(item.name || "Unnamed item").trim() || "Unnamed item";
  const category = categoryForItem(item);
  const price = Number(item.price || 0);
  const key = `${category}::${name.toLowerCase()}::${price}`;
  const current =
    productMap.get(key) || {
      name,
      category,
      quantity: 0,
      revenue: 0,
      price,
    };

  current.quantity += qty;
  current.revenue += qty * price;
  productMap.set(key, current);
};

const addProductsForYear = (productMap, inquiry, events, selectedEventIds) => {
  const datedEventCount = Math.max(
    1,
    events.filter((event) => coerceDate(event.date)).length || events.length
  );
  const selectedCount = Math.max(1, selectedEventIds.size);

  (Array.isArray(inquiry.items) ? inquiry.items : []).forEach((item) => {
    const totalQty = Math.max(0, Number(item.quantity || 0));
    if (totalQty <= 0) return;

    const allocations = normalizeAllocations(item, events);
    if (allocations.length > 0) {
      const selectedQty = allocations
        .filter((row) => selectedEventIds.has(row.eventId))
        .reduce((sum, row) => sum + row.quantity, 0);
      addProduct(productMap, item, selectedQty);
      return;
    }

    addProduct(productMap, item, totalQty * (selectedCount / datedEventCount));
  });
};

const depositsForYear = (inquiry, selectedYear) => {
  const months = Array(12).fill(0);
  let total = 0;

  (Array.isArray(inquiry.deposits) ? inquiry.deposits : []).forEach((deposit) => {
    const date = coerceDate(deposit.date || deposit.createdAt || deposit.timestamp);
    if (!date || date.getFullYear() !== selectedYear) return;
    const amount = Number(deposit.amount || 0);
    months[date.getMonth()] += amount;
    total += amount;
  });

  return { months, total };
};

const makeMonthRows = () =>
  MONTH_LABELS.map((label, index) => ({
    label,
    index,
    revenue: 0,
    deposits: 0,
    events: 0,
    inquiries: new Set(),
  }));

const initialStatusRows = () =>
  STATUS_OPTIONS.reduce((rows, status) => {
    rows.set(status, { status, inquiries: 0, events: 0, value: 0 });
    return rows;
  }, new Map());

const buildReport = (inquiries, selectedYear, basis) => {
  const months = makeMonthRows();
  const statusRows = initialStatusRows();
  const productMap = new Map();
  const inquiryIds = new Set();
  const topBookings = [];
  const totals = {
    revenue: 0,
    quoteValue: 0,
    subtotal: 0,
    discounts: 0,
    fees: 0,
    travel: 0,
    tax: 0,
    depositsCollected: 0,
    appliedDeposits: 0,
    balance: 0,
    events: 0,
  };

  inquiries.forEach((inquiry) => {
    const status = inquiry.status || "Processing";
    const events = normalizeEvents(inquiry);
    const datedEvents = getDatedEvents(inquiry);
    const selectedEvents = datedEvents.filter(
      (event) => event.dateObject.getFullYear() === selectedYear
    );
    if (selectedEvents.length === 0) return;

    if (!statusRows.has(status)) {
      statusRows.set(status, { status, inquiries: 0, events: 0, value: 0 });
    }

    const inquiryTotals = calcTotals(inquiry);
    const eventLineTotals = buildEventLineTotals(inquiry, events);
    const lineTotalSum = Array.from(eventLineTotals.values()).reduce(
      (sum, value) => sum + value,
      0
    );
    const eventValueRows = selectedEvents.map((event) => {
      const lineValue = eventLineTotals.get(event.id) || 0;
      const share =
        inquiryTotals.subtotal > 0 && lineTotalSum > 0
          ? lineValue / lineTotalSum
          : 1 / Math.max(1, datedEvents.length);
      return {
        event,
        value: inquiryTotals.total * share,
      };
    });
    const selectedValue = eventValueRows.reduce(
      (sum, row) => sum + row.value,
      0
    );
    const selectedShare =
      inquiryTotals.total > 0
        ? selectedValue / inquiryTotals.total
        : selectedEvents.length / Math.max(1, datedEvents.length);
    const statusRow = statusRows.get(status);
    statusRow.inquiries += 1;
    statusRow.events += selectedEvents.length;
    statusRow.value += selectedValue;
    totals.quoteValue += selectedValue;

    if (!statusAllowed(status, basis)) return;

    inquiryIds.add(inquiry.id);
    totals.revenue += selectedValue;
    totals.subtotal += inquiryTotals.subtotal * selectedShare;
    totals.discounts += inquiryTotals.discountApplied * selectedShare;
    totals.fees += inquiryTotals.feeApplied * selectedShare;
    totals.travel += inquiryTotals.travel * selectedShare;
    totals.tax += inquiryTotals.taxApplied * selectedShare;
    totals.events += selectedEvents.length;

    const allDeposits = sumDeposits(inquiry) * selectedShare;
    const balance = Math.max(0, selectedValue - allDeposits);
    totals.appliedDeposits += allDeposits;
    totals.balance += balance;

    const collected = depositsForYear(inquiry, selectedYear);
    totals.depositsCollected += collected.total;
    collected.months.forEach((amount, monthIndex) => {
      months[monthIndex].deposits += amount;
    });

    eventValueRows.forEach(({ event, value }) => {
      const month = months[event.dateObject.getMonth()];
      month.revenue += value;
      month.events += 1;
      month.inquiries.add(inquiry.id);
    });

    addProductsForYear(
      productMap,
      inquiry,
      events,
      new Set(selectedEvents.map((event) => event.id))
    );

    topBookings.push({
      id: inquiry.id,
      name: inquiry.name || inquiry.userName || "Unknown client",
      status,
      value: selectedValue,
      events: selectedEvents.length,
      firstDate: selectedEvents[0]?.dateObject,
    });
  });

  const products = Array.from(productMap.values()).sort((a, b) => {
    if (b.revenue !== a.revenue) return b.revenue - a.revenue;
    return b.quantity - a.quantity;
  });
  const categoryRows = Array.from(
    products.reduce((map, product) => {
      const current =
        map.get(product.category) || {
          category: product.category,
          quantity: 0,
          revenue: 0,
        };
      current.quantity += product.quantity;
      current.revenue += product.revenue;
      map.set(product.category, current);
      return map;
    }, new Map()).values()
  ).sort((a, b) => b.revenue - a.revenue);

  return {
    months: months.map((month) => ({
      ...month,
      inquiries: month.inquiries.size,
    })),
    statusRows: Array.from(statusRows.values()).filter(
      (row) => row.inquiries > 0 || STATUS_OPTIONS.includes(row.status)
    ),
    products,
    categoryRows,
    topBookings: topBookings.sort((a, b) => b.value - a.value).slice(0, 8),
    totals: {
      ...totals,
      inquiries: inquiryIds.size,
      productQuantity: products.reduce((sum, product) => sum + product.quantity, 0),
      averageEvent: totals.events > 0 ? totals.revenue / totals.events : 0,
    },
  };
};

const yearOptionsFor = (inquiries) => {
  const years = new Set([new Date().getFullYear()]);
  inquiries.forEach((inquiry) => {
    getDatedEvents(inquiry).forEach((event) => {
      years.add(event.dateObject.getFullYear());
    });
  });
  return Array.from(years).sort((a, b) => b - a);
};

const csvEscape = (value) => {
  const text = String(value ?? "");
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
};

const downloadCsv = (report, selectedYear) => {
  if (typeof window === "undefined") return;
  const lines = [
    ["Month", "Revenue", "Payments collected", "Events", "Inquiries"],
    ...report.months.map((month) => [
      month.label,
      month.revenue.toFixed(2),
      month.deposits.toFixed(2),
      month.events,
      month.inquiries,
    ]),
    [],
    ["Product", "Category", "Quantity", "Revenue"],
    ...report.products.map((product) => [
      product.name,
      product.category,
      product.quantity.toFixed(2),
      product.revenue.toFixed(2),
    ]),
  ];
  const csv = lines.map((row) => row.map(csvEscape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `or-music-year-report-${selectedYear}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

export default function AdminYearReport() {
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [basis, setBasis] = useState("active");

  useEffect(() => {
    const inquiriesQuery = query(
      collection(db, "inquiries"),
      orderBy("timestamp", "desc")
    );
    const stop = onSnapshot(
      inquiriesQuery,
      (snap) => {
        setInquiries(
          snap.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          }))
        );
        setLoading(false);
        setLoadError("");
      },
      (error) => {
        console.error("Year report load failed:", error);
        setLoadError("Could not load the year report.");
        setLoading(false);
      }
    );
    return () => stop();
  }, []);

  const yearOptions = useMemo(() => yearOptionsFor(inquiries), [inquiries]);
  const report = useMemo(
    () => buildReport(inquiries, Number(selectedYear), basis),
    [basis, inquiries, selectedYear]
  );
  const maxMonthlyRevenue = Math.max(
    1,
    ...report.months.map((month) => month.revenue)
  );

  return (
    <Container fluid="xl" className="admin-year-report py-3">
      <div className="admin-report-header">
        <div>
          <div className="admin-dashboard-kicker">
            <BarChart3 size={16} />
            Admin reports
          </div>
          <h1>Year breakdown</h1>
          <p>Revenue, payments, events, and products sold by year.</p>
        </div>
        <div className="admin-report-controls">
          <Form.Group controlId="reportYear">
            <Form.Label>Year</Form.Label>
            <Form.Select
              value={selectedYear}
              onChange={(event) => setSelectedYear(Number(event.target.value))}
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
          <Form.Group controlId="reportBasis">
            <Form.Label>Revenue basis</Form.Label>
            <Form.Select
              value={basis}
              onChange={(event) => setBasis(event.target.value)}
            >
              {REVENUE_BASIS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
          <Button
            type="button"
            variant="outline-primary"
            onClick={() => downloadCsv(report, selectedYear)}
            disabled={loading}
          >
            <Download size={16} />
            CSV
          </Button>
        </div>
      </div>

      {loadError ? <div className="admin-dashboard-empty">{loadError}</div> : null}

      {loading ? (
        <div className="d-flex align-items-center justify-content-center py-5">
          <Spinner animation="border" role="status" />
        </div>
      ) : (
        <>
          <div className="admin-report-kpis" aria-label="Year summary">
            <div className="admin-report-kpi">
              <span>
                <DollarSign size={18} />
                Revenue
              </span>
              <strong>{money(report.totals.revenue)}</strong>
            </div>
            <div className="admin-report-kpi">
              <span>
                <WalletCards size={18} />
                Payments collected
              </span>
              <strong>{money(report.totals.depositsCollected)}</strong>
            </div>
            <div className="admin-report-kpi">
              <span>
                <ReceiptText size={18} />
                Outstanding
              </span>
              <strong>{money(report.totals.balance)}</strong>
            </div>
            <div className="admin-report-kpi">
              <span>
                <CalendarDays size={18} />
                Events
              </span>
              <strong>{formatNumber(report.totals.events)}</strong>
            </div>
            <div className="admin-report-kpi">
              <span>
                <PackageCheck size={18} />
                Products sold
              </span>
              <strong>{formatQuantity(report.totals.productQuantity)}</strong>
            </div>
            <div className="admin-report-kpi">
              <span>
                <TrendingUp size={18} />
                Avg/event
              </span>
              <strong>{money(report.totals.averageEvent)}</strong>
            </div>
          </div>

          <Row className="g-3 align-items-start">
            <Col xl={8}>
              <section className="admin-report-section">
                <div className="admin-report-section-heading">
                  <div>
                    <h2>Monthly breakdown</h2>
                    <span>{formatNumber(report.totals.inquiries)} inquiries</span>
                  </div>
                  <Badge bg="light" text="dark">
                    {selectedYear}
                  </Badge>
                </div>
                <div className="admin-report-table-wrap">
                  <table className="admin-report-table">
                    <thead>
                      <tr>
                        <th>Month</th>
                        <th>Revenue</th>
                        <th>Payments</th>
                        <th>Events</th>
                        <th>Inquiries</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.months.map((month) => (
                        <tr key={month.label}>
                          <td>
                            <div className="admin-report-month">
                              <strong>{month.label}</strong>
                              <span
                                style={{
                                  width: `${Math.max(
                                    2,
                                    (month.revenue / maxMonthlyRevenue) * 100
                                  )}%`,
                                }}
                              />
                            </div>
                          </td>
                          <td>{money(month.revenue)}</td>
                          <td>{money(month.deposits)}</td>
                          <td>{formatNumber(month.events)}</td>
                          <td>{formatNumber(month.inquiries)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </Col>
            <Col xl={4}>
              <section className="admin-report-section">
                <div className="admin-report-section-heading">
                  <div>
                    <h2>Status mix</h2>
                    <span>{money(report.totals.quoteValue)} total value</span>
                  </div>
                </div>
                <div className="admin-report-status-list">
                  {report.statusRows.map((row) => (
                    <div key={row.status} className="admin-report-status-row">
                      <div>
                        <span
                          className={`admin-status-badge ${statusClass(
                            row.status
                          )}`}
                        >
                          {row.status}
                        </span>
                        <small>
                          {formatNumber(row.inquiries)} inquiries,{" "}
                          {formatNumber(row.events)} events
                        </small>
                      </div>
                      <strong>{money(row.value)}</strong>
                    </div>
                  ))}
                </div>
              </section>

              <section className="admin-report-section mt-3">
                <div className="admin-report-section-heading">
                  <div>
                    <h2>Charges</h2>
                    <span>Included in revenue</span>
                  </div>
                </div>
                <div className="admin-report-money-list">
                  <div>
                    <span>Subtotal</span>
                    <strong>{money(report.totals.subtotal)}</strong>
                  </div>
                  <div>
                    <span>Discounts</span>
                    <strong>{money(report.totals.discounts)}</strong>
                  </div>
                  <div>
                    <span>Fees</span>
                    <strong>{money(report.totals.fees)}</strong>
                  </div>
                  <div>
                    <span>Travel</span>
                    <strong>{money(report.totals.travel)}</strong>
                  </div>
                  <div>
                    <span>Tax</span>
                    <strong>{money(report.totals.tax)}</strong>
                  </div>
                </div>
              </section>
            </Col>
          </Row>

          <Row className="g-3 align-items-start mt-1">
            <Col xl={7}>
              <section className="admin-report-section">
                <div className="admin-report-section-heading">
                  <div>
                    <h2>Products sold</h2>
                    <span>{formatQuantity(report.totals.productQuantity)} total</span>
                  </div>
                </div>
                {report.products.length === 0 ? (
                  <div className="admin-report-empty">No products for this year.</div>
                ) : (
                  <div className="admin-report-product-list">
                    {report.products.slice(0, 15).map((product, index) => (
                      <div
                        key={`${product.category}-${product.name}-${product.price}`}
                        className="admin-report-product-row"
                      >
                        <span className="admin-report-rank">{index + 1}</span>
                        <div>
                          <strong>{product.name}</strong>
                          <span>
                            {product.category} · {preciseMoney(product.price)} each
                          </span>
                        </div>
                        <div>
                          <strong>{formatQuantity(product.quantity)}</strong>
                          <span>{money(product.revenue)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </Col>
            <Col xl={5}>
              <section className="admin-report-section">
                <div className="admin-report-section-heading">
                  <div>
                    <h2>Categories</h2>
                    <span>Product revenue</span>
                  </div>
                </div>
                <div className="admin-report-category-list">
                  {report.categoryRows.length === 0 ? (
                    <div className="admin-report-empty">No category sales yet.</div>
                  ) : (
                    report.categoryRows.map((row) => (
                      <div key={row.category}>
                        <div>
                          <strong>{row.category}</strong>
                          <span>{formatQuantity(row.quantity)} sold</span>
                        </div>
                        <strong>{money(row.revenue)}</strong>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section className="admin-report-section mt-3">
                <div className="admin-report-section-heading">
                  <div>
                    <h2>Top bookings</h2>
                    <span>Highest revenue inquiries</span>
                  </div>
                </div>
                {report.topBookings.length === 0 ? (
                  <div className="admin-report-empty">No bookings for this year.</div>
                ) : (
                  <div className="admin-report-booking-list">
                    {report.topBookings.map((booking) => (
                      <Link
                        key={booking.id}
                        to="/inquiries-admin"
                        className="admin-report-booking-row"
                      >
                        <div>
                          <strong>{booking.name}</strong>
                          <span>
                            {booking.firstDate
                              ? booking.firstDate.toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                })
                              : "Date TBD"}{" "}
                            · {formatNumber(booking.events)} event
                            {booking.events === 1 ? "" : "s"}
                          </span>
                        </div>
                        <div>
                          <span
                            className={`admin-status-badge ${statusClass(
                              booking.status
                            )}`}
                          >
                            {booking.status}
                          </span>
                          <strong>{money(booking.value)}</strong>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </section>
            </Col>
          </Row>
        </>
      )}
    </Container>
  );
}
