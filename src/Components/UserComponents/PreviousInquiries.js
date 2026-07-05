// src/components/user/PreviousInquiries.jsx
import React, { useState, useEffect } from "react";
import { Badge, Button, Form } from "react-bootstrap";
import {
  collection,
  doc,
  query,
  orderBy,
  onSnapshot,
  runTransaction,
} from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import db from "../../api/firestore/firestore";
import {
  to12h,
  prettyDate,
  prettyDateTimeMMDDYY,
} from "../../utils/formatters";
import ContractModal from "../contracts/ContractModal";
import InquiryItineraries from "../Itineraries/InquiryItineraries";

const money = (v) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    Number(v || 0)
  );

const makeEventId = () =>
  crypto.randomUUID?.() || `event-${Date.now()}-${Math.random()}`;

const normalizeEvents = (events = []) =>
  (Array.isArray(events) ? events : []).map((ev, idx) => ({
    ...ev,
    id: ev?.id || `event-${idx}`,
  }));

const cleanEventRows = (events = []) =>
  normalizeEvents(events).map((event) => ({
    id: event.id || makeEventId(),
    type: event.type || "",
    venue: event.venue || "",
    date: event.date || "",
    startTime: event.startTime || "",
    endTime: event.endTime || "",
  }));

const eventLabel = (ev) => {
  if (!ev) return "Not assigned to a specific event";
  const date = ev.date ? prettyDate(ev.date) : "Date N/A";
  const time =
    ev.startTime || ev.endTime
      ? `, ${ev.startTime ? to12h(ev.startTime) : "Start N/A"} - ${
          ev.endTime ? to12h(ev.endTime) : "End N/A"
        }`
      : "";
  const venue = ev.venue ? ` at ${ev.venue}` : "";
  return `${ev.type || "Event"} on ${date}${time}${venue}`;
};

const normalizeAllocations = (item = {}, events = []) => {
  const eventIds = new Set(events.map((ev) => ev.id));
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

const itemEventLabel = (inquiry, item) => {
  const events = normalizeEvents(inquiry?.events);
  const eventMap = new Map(events.map((ev) => [ev.id, ev]));
  const allocations = normalizeAllocations(item, events);
  const assigned = allocations.reduce((sum, row) => sum + row.quantity, 0);
  const totalQty = Math.max(0, Number(item?.quantity || 0));
  const lines = allocations.map(
    (row) => `${row.quantity} to ${eventLabel(eventMap.get(row.eventId))}`
  );
  const remaining = totalQty - assigned;
  if (remaining > 0) lines.push(`${remaining} unassigned/general`);
  return lines.length ? lines.join("; ") : "Not assigned to a specific event";
};

const StatusBadge = ({ status }) => {
  const s = (status || "No Status").toLowerCase();
  const color = s.includes("processing")
    ? "secondary"
    : s.includes("approved") || s.includes("confirmed")
    ? "success"
    : s.includes("rejected") || s.includes("cancel")
    ? "danger"
    : s.includes("pending")
    ? "warning"
    : "info";
  return <Badge bg={color}>{status || "No Status"}</Badge>;
};

const statusFlow = ["Processing", "Pending", "Approved", "Confirmed", "Completed"];

const CUSTOMER_INQUIRY_TABS = [
  { key: "overview", label: "Overview" },
  { key: "events", label: "Events" },
  { key: "services", label: "Services" },
  { key: "payments", label: "Payments" },
  { key: "contracts", label: "Contracts" },
  { key: "itinerary", label: "Itinerary" },
];

const statusClass = (status = "Processing") =>
  `status-${String(status || "Processing")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")}`;

const isCompletedStatus = (status = "") =>
  String(status || "").trim().toLowerCase() === "completed";

const customerName = (inquiry = {}) =>
  inquiry.name || inquiry.userName || inquiry.email || inquiry.userEmail || "Inquiry";

const inquiryDisplayName = (inquiry = {}) => {
  const name = customerName(inquiry);
  const events = normalizeEvents(inquiry.events);
  if (events.length !== 1) return name;

  const [event] = events;
  return [
    name,
    event.date ? prettyDate(event.date) : "",
    event.type || "",
  ]
    .filter(Boolean)
    .join(" ");
};

const InquiryTimeline = ({ inquiry }) => {
  const status = inquiry?.status || "Processing";
  const currentIdx = Math.max(
    0,
    statusFlow.findIndex((s) => s.toLowerCase() === status.toLowerCase())
  );
  const hasContract = (inquiry?.contracts || []).length > 0;
  const signedContract = (inquiry?.contracts || []).some(
    (c) => c.clientSignature && c.adminSignature
  );
  const hasDeposit = sumDeposits(inquiry) > 0;

  const steps = statusFlow.map((label, idx) => ({
    label,
    done: idx <= currentIdx,
  }));

  return (
    <div className="status-timeline mt-3" aria-label="Inquiry progress">
      {steps.map((step) => (
        <div
          key={step.label}
          className={`status-step ${step.done ? "is-done" : ""}`}
        >
          <span />
          {step.label}
        </div>
      ))}
      <div className={`status-step ${hasContract ? "is-done" : ""}`}>
        <span />
        Contract sent
      </div>
      <div className={`status-step ${signedContract ? "is-done" : ""}`}>
        <span />
        Contract signed
      </div>
      <div className={`status-step ${hasDeposit ? "is-done" : ""}`}>
        <span />
        Deposit logged
      </div>
    </div>
  );
};

// math matches admin, deposits are not included in totals
const calcTotals = (inquiry) => {
  const items = Array.isArray(inquiry.items) ? inquiry.items : [];
  const subtotal = items.reduce(
    (sum, it) =>
      sum + Number(it.price || 0) * Math.max(0, Number(it.quantity || 0)),
    0
  );

  const dType =
    inquiry.discountType === "percent" || inquiry.discountType === "amount"
      ? inquiry.discountType
      : inquiry.discount != null
      ? "amount"
      : "amount";
  const dRaw =
    inquiry.discountType === "percent"
      ? Number(inquiry.discountValue || 0)
      : inquiry.discount != null
      ? Number(inquiry.discount || 0)
      : Number(inquiry.discountValue || 0) || 0;
  const discountApplied =
    dType === "percent"
      ? Math.max(0, Math.min(100, dRaw)) * 0.01 * subtotal
      : Math.max(0, dRaw);

  const baseAfterDiscount = Math.max(0, subtotal - discountApplied);

  const fType =
    inquiry.feeType === "percent" || inquiry.feeType === "amount"
      ? inquiry.feeType
      : "amount";
  const fRaw = Number(inquiry.feeValue || 0);
  const feeApplied =
    fType === "percent"
      ? Math.max(0, Math.min(100, fRaw)) * 0.01 * baseAfterDiscount
      : Math.max(0, fRaw);

  const travel = Math.max(0, Number(inquiry.travelAmount || 0));

  const taxPercent = Math.max(
    0,
    Math.min(100, Number(inquiry.taxPercent || 0))
  );
  const taxApplied = taxPercent * 0.01 * baseAfterDiscount;

  const total = Math.max(
    0,
    baseAfterDiscount + feeApplied + travel + taxApplied
  );

  return {
    subtotal,
    discountApplied,
    baseAfterDiscount,
    feeApplied,
    travel,
    taxApplied,
    total,
    dType,
    dRaw,
    fType,
    fRaw,
    taxPercent,
  };
};

const sumDeposits = (inquiry) =>
  (Array.isArray(inquiry?.deposits) ? inquiry.deposits : []).reduce(
    (s, d) => s + Number(d?.amount || 0),
    0
  );

const PreviousInquiries = () => {
  const [inquiries, setInquiries] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [showContract, setShowContract] = useState(false);
  const [contractInquiry, setContractInquiry] = useState(null);
  const [activeContract, setActiveContract] = useState(null);
  const [activeInquiryId, setActiveInquiryId] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [isEditingEvents, setIsEditingEvents] = useState(false);
  const [isEditingServices, setIsEditingServices] = useState(false);
  const [detailDraft, setDetailDraft] = useState({ eventDetails: "" });
  const [eventRows, setEventRows] = useState([]);
  const [newEventDraft, setNewEventDraft] = useState({
    type: "",
    venue: "",
    date: "",
    startTime: "",
    endTime: "",
  });
  const [serviceDrafts, setServiceDrafts] = useState({});
  const [addServiceDraft, setAddServiceDraft] = useState({
    pickId: "",
    eventId: "",
    quantity: 1,
  });

  const auth = getAuth();

  useEffect(() => {
    let stopAuth = () => {};
    let stopSnap = () => {};

    stopAuth = onAuthStateChanged(auth, (user) => {
      stopSnap?.();
      setInquiries([]);
      setCurrentUser(user || null);

      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const ref = collection(db, "inquiries");
        const q = query(ref, orderBy("timestamp", "desc"));

        stopSnap = onSnapshot(
          q,
          (snap) => {
            const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            const mine = rows.filter((r) => {
              const byId = r.userId && user.uid && r.userId === user.uid;
              const byEmail = r.email && user.email && r.email === user.email;
              return byId || byEmail;
            });
            setInquiries(mine);
            setLoading(false);
          },
          (err) => {
            console.error("Realtime inquiries error:", err);
            setLoading(false);
          }
        );
      } catch (e) {
        console.error("Failed to start realtime listener:", e);
        setLoading(false);
      }
    });

    return () => {
      stopSnap?.();
      stopAuth?.();
    };
  }, [auth]);

  useEffect(() => {
    const rentalsQuery = query(collection(db, "rentals"), orderBy("name", "asc"));
    const stop = onSnapshot(
      rentalsQuery,
      (snap) =>
        setCatalog(snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))),
      (error) => console.error("Rentals catalog load failed:", error)
    );
    return () => stop();
  }, []);

  useEffect(() => {
    if (inquiries.length === 0) {
      setActiveInquiryId("");
      return;
    }
    if (!activeInquiryId || !inquiries.some((inq) => inq.id === activeInquiryId)) {
      setActiveInquiryId(inquiries[0].id);
    }
  }, [activeInquiryId, inquiries]);

  const activeInquiry =
    inquiries.find((inquiry) => inquiry.id === activeInquiryId) || inquiries[0];
  const events = normalizeEvents(activeInquiry?.events);
  const items = Array.isArray(activeInquiry?.items) ? activeInquiry.items : [];
  const contracts = Array.isArray(activeInquiry?.contracts)
    ? activeInquiry.contracts
    : [];
  const deposits = Array.isArray(activeInquiry?.deposits)
    ? activeInquiry.deposits
    : [];
  const isCompletedInquiry = isCompletedStatus(activeInquiry?.status);
  const canEditInquiry =
    Boolean(activeInquiry) && contracts.length === 0 && !isCompletedInquiry;

  useEffect(() => {
    if (!activeInquiry) return;
    if (!isEditingDetails) {
      setDetailDraft({ eventDetails: activeInquiry.eventDetails || "" });
    }
    if (!isEditingEvents) {
      setEventRows(cleanEventRows(activeInquiry.events));
    }
    if (!isEditingServices) {
      setServiceDrafts({});
      setAddServiceDraft({
        pickId: "",
        eventId: normalizeEvents(activeInquiry.events)[0]?.id || "",
        quantity: 1,
      });
    }
    setSaveError("");
  }, [activeInquiry, isEditingDetails, isEditingEvents, isEditingServices]);

  useEffect(() => {
    if (canEditInquiry) return;
    setIsEditingDetails(false);
    setIsEditingEvents(false);
    setIsEditingServices(false);
  }, [canEditInquiry]);

  const updateEditableInquiry = async (payload) => {
    if (!activeInquiry || !currentUser) return false;
    try {
      setSaving(true);
      setSaveError("");
      const inquiryRef = doc(db, "inquiries", activeInquiry.id);
      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(inquiryRef);
        if (!snap.exists()) {
          throw new Error("This inquiry could not be found.");
        }
        const latest = snap.data();
        const latestContracts = Array.isArray(latest.contracts)
          ? latest.contracts
          : [];
        if (latestContracts.length > 0) {
          throw new Error(
            "This inquiry can no longer be edited because a contract has been created."
          );
        }
        if (isCompletedStatus(latest.status)) {
          throw new Error(
            "This inquiry can no longer be edited because the event is completed."
          );
        }
        const ownsById =
          latest.userId && currentUser.uid && latest.userId === currentUser.uid;
        const ownsByEmail =
          latest.email && currentUser.email && latest.email === currentUser.email;
        if (!ownsById && !ownsByEmail) {
          throw new Error("You can only edit your own inquiries.");
        }
        transaction.update(inquiryRef, payload);
      });
      return true;
    } catch (error) {
      console.error("Customer inquiry update failed:", error);
      setSaveError(
        error?.message || "We could not save those changes. Please try again."
      );
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveDetails = async () => {
    const saved = await updateEditableInquiry({
      eventDetails: detailDraft.eventDetails || "",
    });
    if (saved) setIsEditingDetails(false);
  };

  const setEventRowField = (index, key, value) => {
    setEventRows((rows) =>
      rows.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [key]: value } : row
      )
    );
  };

  const addEventRow = () => {
    if (!newEventDraft.type || !newEventDraft.date) return;
    setEventRows((rows) => [
      ...rows,
      {
        ...newEventDraft,
        id: makeEventId(),
      },
    ]);
    setNewEventDraft({
      type: "",
      venue: "",
      date: "",
      startTime: "",
      endTime: "",
    });
  };

  const removeEventRow = (index) => {
    setEventRows((rows) => rows.filter((_, rowIndex) => rowIndex !== index));
  };

  const saveEvents = async () => {
    if (!activeInquiry) return;
    const cleanRows = cleanEventRows(eventRows);
    const eventIds = new Set(cleanRows.map((event) => event.id));
    const cleanItems = items.map((item) => ({
      ...item,
      eventId: item.eventId && eventIds.has(item.eventId) ? item.eventId : "",
      eventAllocations: normalizeAllocations(item, cleanRows),
    }));
    const saved = await updateEditableInquiry({
      events: cleanRows,
      items: cleanItems,
    });
    if (saved) setIsEditingEvents(false);
  };

  const cleanServiceItems = (nextItems, nextEvents = events) => {
    const eventIds = new Set(nextEvents.map((event) => event.id));
    return nextItems.map((item) => ({
      id: item.id || crypto.randomUUID?.() || String(Date.now()),
      name: item.name || "Service",
      description: item.description || "",
      price: Number(item.price || 0),
      quantity: Math.max(0, Number(item.quantity || 0)),
      media: Array.isArray(item.media) ? item.media : [],
      eventId: item.eventId && eventIds.has(item.eventId) ? item.eventId : "",
      eventAllocations: normalizeAllocations(item, nextEvents),
    }));
  };

  const saveServiceItems = async (nextItems) => {
    const saved = await updateEditableInquiry({
      items: cleanServiceItems(nextItems),
    });
    return saved;
  };

  const setServiceDraftField = (index, key, value) => {
    setServiceDrafts((drafts) => ({
      ...drafts,
      [index]: {
        ...(drafts[index] || {}),
        [key]: value,
      },
    }));
  };

  const saveServiceRow = async (index) => {
    const draft = serviceDrafts[index] || {};
    const nextItems = [...items];
    const next = { ...nextItems[index] };
    next.quantity = Math.max(0, Number(draft.quantity ?? next.quantity ?? 0));
    const eventId = draft.eventId ?? next.eventId ?? "";
    next.eventId = eventId;
    next.eventAllocations = eventId
      ? [{ eventId, quantity: next.quantity }]
      : [];
    nextItems[index] = next;
    await saveServiceItems(nextItems);
  };

  const removeServiceRow = async (index) => {
    await saveServiceItems(items.filter((_, itemIndex) => itemIndex !== index));
  };

  const handlePickCatalog = (rentalId) => {
    const picked = catalog.find((row) => row.id === rentalId);
    if (!picked) {
      setAddServiceDraft((current) => ({
        ...current,
        pickId: "",
        name: "",
        description: "",
        price: "",
      }));
      return;
    }
    setAddServiceDraft((current) => ({
      ...current,
      pickId: rentalId,
      name: picked.name || "",
      description: picked.description || "",
      price: picked.price != null ? String(picked.price) : "0",
      media: Array.isArray(picked.media) ? picked.media : [],
    }));
  };

  const addService = async () => {
    if (!addServiceDraft.name) return;
    const quantity = Math.max(1, Number(addServiceDraft.quantity || 1));
    const eventId = addServiceDraft.eventId || "";
    const nextItem = {
      id: crypto.randomUUID?.() || String(Date.now()),
      name: addServiceDraft.name,
      description: addServiceDraft.description || "",
      price: Number(addServiceDraft.price || 0),
      quantity,
      media: Array.isArray(addServiceDraft.media) ? addServiceDraft.media : [],
      eventId,
      eventAllocations: eventId ? [{ eventId, quantity }] : [],
    };
    const saved = await saveServiceItems([...items, nextItem]);
    if (saved) {
      setAddServiceDraft({
        pickId: "",
        eventId: events[0]?.id || "",
        quantity: 1,
      });
    }
  };

  const openClientContract = (inq, c) => {
    setContractInquiry(inq);
    setActiveContract(c);
    setShowContract(true);
  };

  if (loading) {
    return (
      <div className="customer-inquiries-shell">
        <div className="customer-inquiries-empty">
          <h2>My inquiries</h2>
          <p>Loading your event details...</p>
        </div>
      </div>
    );
  }

  if (inquiries.length === 0) {
    return (
      <div className="customer-inquiries-shell">
        <div className="customer-inquiries-empty">
          <h2>No inquiries yet</h2>
          <p>Your submitted event inquiries will show here.</p>
        </div>
      </div>
    );
  }

  const totals = calcTotals(activeInquiry);
  const totalDeposits = sumDeposits(activeInquiry);
  const remaining = Math.max(0, totals.total - totalDeposits);
  const signedContracts = contracts.filter((contract) => contract.clientSignature)
    .length;
  const firstEvent = events[0];
  const tabBadges = {
    events: events.length ? String(events.length) : "",
    services: items.length ? String(items.length) : "",
    payments: remaining > 0 ? "Due" : "Paid",
    contracts: contracts.length ? String(contracts.length) : "",
    itinerary: events.length ? String(events.length) : "",
  };
  const activeSubmittedDate = activeInquiry?.timestamp
    ? prettyDateTimeMMDDYY(activeInquiry.timestamp)
    : "Submitted date unavailable";

  return (
    <div className="customer-inquiries-shell">
      <div className="customer-inquiries-hero">
        <div>
          <div className="customer-inquiries-kicker">My inquiries</div>
          <h2>Event plans, contracts, and payments</h2>
          <p>
            Review each inquiry, track its status, view contracts, and open
            event itineraries from one place.
          </p>
        </div>
        <div className="customer-inquiries-hero-stats">
          <div>
            <span>Total inquiries</span>
            <strong>{inquiries.length}</strong>
          </div>
          <div>
            <span>Open balance</span>
            <strong>{money(remaining)}</strong>
          </div>
        </div>
      </div>

      <div className="customer-inquiries-layout">
        <aside className="customer-inquiries-list-panel">
          <div className="customer-inquiries-list-heading">
            <span>Inquiry history</span>
            <strong>{inquiries.length}</strong>
          </div>
          <div className="customer-inquiries-list">
            {inquiries.map((inquiry) => {
              const inquiryEvents = normalizeEvents(inquiry.events);
              const inquiryTotals = calcTotals(inquiry);
              const inquiryBalance = Math.max(
                0,
                inquiryTotals.total - sumDeposits(inquiry)
              );
              const isActive = inquiry.id === activeInquiry.id;
              const leadEvent = inquiryEvents[0];
              const displayName = inquiryDisplayName(inquiry);

              return (
                <button
                  key={inquiry.id}
                  type="button"
                  className={`customer-inquiry-list-item ${statusClass(
                    inquiry.status
                  )} ${isActive ? "is-active" : ""}`}
                  onClick={() => {
                    setActiveInquiryId(inquiry.id);
                    setActiveTab("overview");
                  }}
                >
                  <span className="customer-inquiry-list-date">
                    {inquiry.timestamp
                      ? prettyDateTimeMMDDYY(inquiry.timestamp)
                      : "Inquiry"}
                  </span>
                  <strong>{displayName}</strong>
                  <span>
                    {inquiryEvents.length > 1
                      ? `${inquiryEvents.length} event dates`
                      : leadEvent?.venue || "Event details pending"}
                  </span>
                  <div>
                    <span className="customer-inquiry-list-status">
                      {inquiry.status || "Processing"}
                    </span>
                    <span>{money(inquiryBalance)} due</span>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <main className="customer-inquiry-detail">
          <div className={`customer-inquiry-detail-hero ${statusClass(activeInquiry.status)}`}>
            <div>
              <span>{activeSubmittedDate}</span>
              <h3>{inquiryDisplayName(activeInquiry)}</h3>
              <p>
                {events.length > 1
                  ? `${events.length} event dates`
                  : firstEvent?.venue || "Event details pending"}
              </p>
            </div>
            <div className="customer-inquiry-detail-status">
              <StatusBadge status={activeInquiry.status} />
            </div>
          </div>

          <div className="customer-inquiry-tabs" role="tablist" aria-label="Inquiry sections">
            {CUSTOMER_INQUIRY_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.key}
                className={activeTab === tab.key ? "is-active" : ""}
                onClick={() => setActiveTab(tab.key)}
              >
                <span>{tab.label}</span>
                {tabBadges[tab.key] ? <small>{tabBadges[tab.key]}</small> : null}
              </button>
            ))}
          </div>

          {saveError ? (
            <div className="customer-edit-alert is-error">{saveError}</div>
          ) : null}

          {canEditInquiry ? (
            <div className="customer-edit-alert">
              You can edit this inquiry until a contract is created.
            </div>
          ) : (
            <div className="customer-edit-alert is-locked">
              {isCompletedInquiry
                ? "This event is completed, so inquiry details are now locked."
                : "A contract has been created, so inquiry details are now locked."}
            </div>
          )}

          <section className={`customer-tab-panel ${activeTab === "overview" ? "" : "d-none"}`}>
            <div className="customer-summary-grid">
              <article>
                <span>Status</span>
                <strong>{activeInquiry.status || "Processing"}</strong>
              </article>
              <article>
                <span>Events</span>
                <strong>{events.length}</strong>
              </article>
              <article>
                <span>Contracts signed</span>
                <strong>
                  {signedContracts}/{contracts.length}
                </strong>
              </article>
              <article>
                <span>Balance</span>
                <strong>{money(remaining)}</strong>
              </article>
            </div>

            <InquiryTimeline inquiry={activeInquiry} />

            <div className="customer-info-grid">
              <article>
                <span>Contact</span>
                <strong>{activeInquiry.name || "Name unavailable"}</strong>
                {activeInquiry.email ? <p>{activeInquiry.email}</p> : null}
                {activeInquiry.phoneNumber ? <p>{activeInquiry.phoneNumber}</p> : null}
              </article>
              <article>
                <div className="customer-edit-heading compact">
                  <div>
                    <span>Inquiry notes</span>
                    <strong>
                      {activeInquiry.eventDetails ? "Notes provided" : "No notes yet"}
                    </strong>
                  </div>
                  {canEditInquiry && !isEditingDetails ? (
                    <Button
                      size="sm"
                      variant="outline-primary"
                      onClick={() => setIsEditingDetails(true)}
                    >
                      Edit
                    </Button>
                  ) : null}
                </div>
                {isEditingDetails ? (
                  <div className="customer-edit-form">
                    <Form.Control
                      as="textarea"
                      rows={5}
                      value={detailDraft.eventDetails}
                      onChange={(event) =>
                        setDetailDraft((current) => ({
                          ...current,
                          eventDetails: event.target.value,
                        }))
                      }
                      disabled={saving}
                    />
                    <div className="customer-edit-actions">
                      <Button
                        size="sm"
                        variant="outline-secondary"
                        onClick={() => {
                          setDetailDraft({
                            eventDetails: activeInquiry.eventDetails || "",
                          });
                          setIsEditingDetails(false);
                        }}
                        disabled={saving}
                      >
                        Cancel
                      </Button>
                      <Button size="sm" onClick={saveDetails} disabled={saving}>
                        {saving ? "Saving" : "Save details"}
                      </Button>
                    </div>
                  </div>
                ) : activeInquiry.eventDetails ? (
                  <p>{activeInquiry.eventDetails}</p>
                ) : null}
              </article>
            </div>
          </section>

          <section className={`customer-tab-panel ${activeTab === "events" ? "" : "d-none"}`}>
            <div className="customer-edit-heading">
              <div>
                <span>Event dates</span>
                <strong>Schedule and locations</strong>
              </div>
              {canEditInquiry ? (
                isEditingEvents ? (
                  <div className="customer-edit-actions">
                    <Button
                      size="sm"
                      variant="outline-secondary"
                      onClick={() => {
                        setEventRows(cleanEventRows(activeInquiry.events));
                        setIsEditingEvents(false);
                      }}
                      disabled={saving}
                    >
                      Cancel
                    </Button>
                    <Button size="sm" onClick={saveEvents} disabled={saving}>
                      {saving ? "Saving" : "Save dates"}
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline-primary"
                    onClick={() => setIsEditingEvents(true)}
                  >
                    Edit dates
                  </Button>
                )
              ) : null}
            </div>

            {isEditingEvents ? (
              <div className="customer-event-editor">
                {eventRows.length === 0 ? (
                  <div className="customer-empty-panel">
                    Add one or more event dates when you know them.
                  </div>
                ) : (
                  eventRows.map((eventRow, index) => (
                    <div key={eventRow.id || index} className="customer-edit-card">
                      <div className="customer-edit-grid">
                        <Form.Group>
                          <Form.Label>Type</Form.Label>
                          <Form.Control
                            value={eventRow.type || ""}
                            onChange={(event) =>
                              setEventRowField(index, "type", event.target.value)
                            }
                            disabled={saving}
                          />
                        </Form.Group>
                        <Form.Group>
                          <Form.Label>Venue</Form.Label>
                          <Form.Control
                            value={eventRow.venue || ""}
                            onChange={(event) =>
                              setEventRowField(index, "venue", event.target.value)
                            }
                            disabled={saving}
                          />
                        </Form.Group>
                        <Form.Group>
                          <Form.Label>Date</Form.Label>
                          <Form.Control
                            type="date"
                            value={eventRow.date || ""}
                            onChange={(event) =>
                              setEventRowField(index, "date", event.target.value)
                            }
                            disabled={saving}
                          />
                        </Form.Group>
                        <Form.Group>
                          <Form.Label>Start</Form.Label>
                          <Form.Control
                            type="time"
                            value={eventRow.startTime || ""}
                            onChange={(event) =>
                              setEventRowField(index, "startTime", event.target.value)
                            }
                            disabled={saving}
                          />
                        </Form.Group>
                        <Form.Group>
                          <Form.Label>End</Form.Label>
                          <Form.Control
                            type="time"
                            value={eventRow.endTime || ""}
                            onChange={(event) =>
                              setEventRowField(index, "endTime", event.target.value)
                            }
                            disabled={saving}
                          />
                        </Form.Group>
                      </div>
                      <div className="customer-edit-actions">
                        <Button
                          size="sm"
                          variant="outline-danger"
                          onClick={() => removeEventRow(index)}
                          disabled={saving}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))
                )}

                <div className="customer-add-box">
                  <div className="customer-panel-heading">
                    <span>Add date</span>
                  </div>
                  <div className="customer-edit-grid">
                    <Form.Group>
                      <Form.Label>Type</Form.Label>
                      <Form.Control
                        value={newEventDraft.type}
                        onChange={(event) =>
                          setNewEventDraft((current) => ({
                            ...current,
                            type: event.target.value,
                          }))
                        }
                        disabled={saving}
                      />
                    </Form.Group>
                    <Form.Group>
                      <Form.Label>Venue</Form.Label>
                      <Form.Control
                        value={newEventDraft.venue}
                        onChange={(event) =>
                          setNewEventDraft((current) => ({
                            ...current,
                            venue: event.target.value,
                          }))
                        }
                        disabled={saving}
                      />
                    </Form.Group>
                    <Form.Group>
                      <Form.Label>Date</Form.Label>
                      <Form.Control
                        type="date"
                        value={newEventDraft.date}
                        onChange={(event) =>
                          setNewEventDraft((current) => ({
                            ...current,
                            date: event.target.value,
                          }))
                        }
                        disabled={saving}
                      />
                    </Form.Group>
                    <Form.Group>
                      <Form.Label>Start</Form.Label>
                      <Form.Control
                        type="time"
                        value={newEventDraft.startTime}
                        onChange={(event) =>
                          setNewEventDraft((current) => ({
                            ...current,
                            startTime: event.target.value,
                          }))
                        }
                        disabled={saving}
                      />
                    </Form.Group>
                    <Form.Group>
                      <Form.Label>End</Form.Label>
                      <Form.Control
                        type="time"
                        value={newEventDraft.endTime}
                        onChange={(event) =>
                          setNewEventDraft((current) => ({
                            ...current,
                            endTime: event.target.value,
                          }))
                        }
                        disabled={saving}
                      />
                    </Form.Group>
                    <div className="customer-edit-grid-action">
                      <Button
                        onClick={addEventRow}
                        disabled={saving || !newEventDraft.type || !newEventDraft.date}
                      >
                        Add date
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ) : events.length === 0 ? (
              <div className="customer-empty-panel">No event dates have been added yet.</div>
            ) : (
              <div className="customer-event-list">
                {events.map((event, index) => (
                  <article key={event.id || index} className="customer-event-card">
                    <div>
                      <span>{event.date ? prettyDate(event.date) : "Date TBD"}</span>
                      <strong>{event.type || "Event"}</strong>
                    </div>
                    <div>
                      <span>Time</span>
                      <strong>
                        {event.startTime || event.endTime
                          ? `${event.startTime ? to12h(event.startTime) : "Start TBD"} - ${
                              event.endTime ? to12h(event.endTime) : "End TBD"
                            }`
                          : "Time TBD"}
                      </strong>
                    </div>
                    <div>
                      <span>Venue</span>
                      <strong>{event.venue || "Venue TBD"}</strong>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className={`customer-tab-panel ${activeTab === "services" ? "" : "d-none"}`}>
            <div className="customer-edit-heading">
              <div>
                <span>Services</span>
                <strong>Selected services and event assignment</strong>
              </div>
              {canEditInquiry ? (
                isEditingServices ? (
                  <Button
                    size="sm"
                    variant="outline-secondary"
                    onClick={() => setIsEditingServices(false)}
                    disabled={saving}
                  >
                    Done
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline-primary"
                    onClick={() => setIsEditingServices(true)}
                  >
                    Edit services
                  </Button>
                )
              ) : null}
            </div>

            {isEditingServices ? (
              <div className="customer-service-editor">
                {items.length === 0 ? (
                  <div className="customer-empty-panel">
                    No services are attached to this inquiry yet.
                  </div>
                ) : (
                  items.map((item, index) => {
                    const draft = serviceDrafts[index] || {};
                    const draftQuantity = draft.quantity ?? item.quantity ?? 0;
                    const allocations = normalizeAllocations(item, events);
                    const draftEventId =
                      draft.eventId ??
                      item.eventId ??
                      allocations[0]?.eventId ??
                      "";

                    return (
                      <div key={`${activeInquiry.id}-edit-service-${index}`} className="customer-edit-card">
                        <div>
                          <strong>{item.name || "Service"}</strong>
                          {item.description ? <p>{item.description}</p> : null}
                          <span>{money(item.price)} each</span>
                        </div>
                        <div className="customer-edit-grid compact">
                          <Form.Group>
                            <Form.Label>Quantity</Form.Label>
                            <Form.Control
                              inputMode="numeric"
                              value={draftQuantity}
                              onChange={(event) =>
                                setServiceDraftField(
                                  index,
                                  "quantity",
                                  event.target.value
                                )
                              }
                              disabled={saving}
                            />
                          </Form.Group>
                          <Form.Group>
                            <Form.Label>Event date</Form.Label>
                            <Form.Select
                              value={draftEventId}
                              onChange={(event) =>
                                setServiceDraftField(index, "eventId", event.target.value)
                              }
                              disabled={saving}
                            >
                              <option value="">General / not assigned</option>
                              {events.map((eventRow) => (
                                <option key={eventRow.id} value={eventRow.id}>
                                  {eventLabel(eventRow)}
                                </option>
                              ))}
                            </Form.Select>
                          </Form.Group>
                          <div className="customer-edit-grid-action multi">
                            <Button
                              size="sm"
                              onClick={() => saveServiceRow(index)}
                              disabled={saving}
                            >
                              Update
                            </Button>
                            <Button
                              size="sm"
                              variant="outline-danger"
                              onClick={() => removeServiceRow(index)}
                              disabled={saving}
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                <div className="customer-add-box">
                  <div className="customer-panel-heading">
                    <span>Add service</span>
                  </div>
                  <div className="customer-edit-grid">
                    <Form.Group>
                      <Form.Label>Service</Form.Label>
                      <Form.Select
                        value={addServiceDraft.pickId || ""}
                        onChange={(event) => handlePickCatalog(event.target.value)}
                        disabled={saving}
                      >
                        <option value="">Choose a service</option>
                        {catalog.map((rental) => (
                          <option key={rental.id} value={rental.id}>
                            {rental.name}
                            {rental.price != null ? `, ${money(rental.price)}` : ""}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                    <Form.Group>
                      <Form.Label>Quantity</Form.Label>
                      <Form.Control
                        inputMode="numeric"
                        value={addServiceDraft.quantity || ""}
                        onChange={(event) =>
                          setAddServiceDraft((current) => ({
                            ...current,
                            quantity: event.target.value,
                          }))
                        }
                        disabled={saving}
                      />
                    </Form.Group>
                    <Form.Group>
                      <Form.Label>Event date</Form.Label>
                      <Form.Select
                        value={addServiceDraft.eventId || ""}
                        onChange={(event) =>
                          setAddServiceDraft((current) => ({
                            ...current,
                            eventId: event.target.value,
                          }))
                        }
                        disabled={saving}
                      >
                        <option value="">General / not assigned</option>
                        {events.map((eventRow) => (
                          <option key={eventRow.id} value={eventRow.id}>
                            {eventLabel(eventRow)}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                    <div className="customer-edit-grid-action">
                      <Button
                        onClick={addService}
                        disabled={saving || !addServiceDraft.name}
                      >
                        Add service
                      </Button>
                    </div>
                  </div>
                  {addServiceDraft.name ? (
                    <div className="customer-add-preview">
                      <strong>{addServiceDraft.name}</strong>
                      {addServiceDraft.description ? (
                        <span>{addServiceDraft.description}</span>
                      ) : null}
                      <span>{money(addServiceDraft.price)} each</span>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : items.length === 0 ? (
              <div className="customer-empty-panel">No services are attached to this inquiry yet.</div>
            ) : (
              <div className="customer-service-list">
                {items.map((item, index) => (
                  <article key={`${activeInquiry.id}-service-${index}`}>
                    <div>
                      <strong>{item.name || "Service"}</strong>
                      {item.description ? <p>{item.description}</p> : null}
                      <span>{itemEventLabel(activeInquiry, item)}</span>
                    </div>
                    <div>
                      <span>Qty {item.quantity || 0}</span>
                      <strong>
                        {money(Number(item.price || 0) * Number(item.quantity || 0))}
                      </strong>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className={`customer-tab-panel ${activeTab === "payments" ? "" : "d-none"}`}>
            <div className="customer-payments-grid">
              <article className="customer-total-card">
                <span>Subtotal</span>
                <strong>{money(totals.subtotal)}</strong>
              </article>
              <article className="customer-total-card">
                <span>Discount</span>
                <strong>{money(totals.discountApplied)}</strong>
              </article>
              <article className="customer-total-card">
                <span>Processing fee</span>
                <strong>{money(totals.feeApplied)}</strong>
              </article>
              <article className="customer-total-card">
                <span>Travel</span>
                <strong>{money(totals.travel)}</strong>
              </article>
              <article className="customer-total-card">
                <span>Tax</span>
                <strong>{money(totals.taxApplied)}</strong>
              </article>
              <article className="customer-total-card is-total">
                <span>Total</span>
                <strong>{money(totals.total)}</strong>
              </article>
            </div>

            <div className="customer-deposit-panel">
              <div className="customer-panel-heading">
                <span>Deposits</span>
                <strong>{money(totalDeposits)}</strong>
              </div>
              {deposits.length === 0 ? (
                <div className="customer-empty-panel">No deposits have been logged yet.</div>
              ) : (
                <div className="customer-deposit-list">
                  {deposits.map((deposit, index) => (
                    <div key={deposit.id || index}>
                      <strong>{money(deposit.amount)}</strong>
                      <span>
                        {deposit.note || "Deposit"}
                        {deposit.date ? `, ${prettyDateTimeMMDDYY(deposit.date)}` : ""}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <div className="customer-balance-row">
                <span>Balance after deposits</span>
                <strong>{money(remaining)}</strong>
              </div>
            </div>
          </section>

          <section className={`customer-tab-panel ${activeTab === "contracts" ? "" : "d-none"}`}>
            {contracts.length === 0 ? (
              <div className="customer-empty-panel">No contracts have been sent yet.</div>
            ) : (
              <div className="customer-contract-list">
                {contracts.map((contract, index) => (
                  <article key={contract.id || index}>
                    <div>
                      <strong>{contract.title || "Contract"}</strong>
                      <span>
                        {contract.clientSignature ? "Client signed" : "Client signature pending"} /{" "}
                        {contract.adminSignature ? "Admin signed" : "Admin signature pending"}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant={contract.clientSignature ? "outline-primary" : "primary"}
                      onClick={() => openClientContract(activeInquiry, contract)}
                    >
                      {contract.clientSignature ? "View contract" : "Review and sign"}
                    </Button>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className={`customer-tab-panel ${activeTab === "itinerary" ? "" : "d-none"}`}>
            <InquiryItineraries inquiry={activeInquiry} mode="customer" />
          </section>
        </main>
      </div>

      <ContractModal
        show={showContract}
        onHide={() => setShowContract(false)}
        inquiry={contractInquiry}
        contract={activeContract}
        mode="client"
      />
    </div>
  );
};

export default PreviousInquiries;
