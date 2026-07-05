import React, { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Col,
  Container,
  Form,
  InputGroup,
  Modal,
  Row,
  Spinner,
} from "react-bootstrap";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  Clock,
  DollarSign,
  Edit3,
  FileText,
  Mail,
  MapPin,
  Package,
  Phone,
  Plus,
  Trash2,
  UserPlus,
  UserRound,
  X,
} from "lucide-react";
import db from "../../api/firestore/firestore";
import {
  prettyDate,
  prettyDateTimeMMDDYY,
  to12h,
} from "../../utils/formatters";
import ContractModal from "../contracts/ContractModal";
import InquiryItineraries from "../Itineraries/InquiryItineraries";

const STATUS_OPTIONS = [
  "Processing",
  "Pending",
  "Approved",
  "Confirmed",
  "Rejected",
  "Cancelled",
  "Completed",
];

const EVENT_DETAIL_TABS = [
  { key: "overview", label: "Overview" },
  { key: "services", label: "Services" },
  { key: "payments", label: "Payments" },
  { key: "contracts", label: "Contracts" },
  { key: "itinerary", label: "Itinerary" },
  { key: "activity", label: "Activity" },
];

const money = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(value || 0));

const catalogOptionLabel = (item = {}) =>
  `${item.name || "Unnamed item"}${
    item.price != null ? `, ${money(item.price)}` : ""
  }`;

const splitCatalogGroups = (catalog = []) => {
  const groups = {
    packages: [],
    rentals: [],
    other: [],
  };
  catalog.forEach((item) => {
    const categories = Array.isArray(item.categories) ? item.categories : [];
    if (categories.includes("packages")) {
      groups.packages.push(item);
    } else if (categories.includes("addons")) {
      groups.rentals.push(item);
    } else {
      groups.other.push(item);
    }
  });
  return groups;
};

const renderCatalogOptionGroups = (catalog = []) => {
  const groups = splitCatalogGroups(catalog);
  return [
    ["Packages", groups.packages],
    ["Rentals", groups.rentals],
    ["Other", groups.other],
  ].map(([label, items]) =>
    items.length ? (
      <optgroup key={label} label={label}>
        {items.map((item) => (
          <option key={item.id} value={item.id}>
            {catalogOptionLabel(item)}
          </option>
        ))}
      </optgroup>
    ) : null
  );
};

const makeEventId = () =>
  crypto.randomUUID?.() || `event-${Date.now()}-${Math.random()}`;

const normalizeEvents = (events = []) =>
  (Array.isArray(events) ? events : []).map((event, index) => ({
    ...event,
    id: event?.id || `event-${index}`,
    sourceIndex: index,
  }));

const cleanEventRows = (events = []) =>
  normalizeEvents(events).map(({ sourceIndex, ...event }) => ({
    ...event,
    id: event.id || makeEventId(),
    type: event.type || "",
    venue: event.venue || "",
    date: event.date || "",
    startTime: event.startTime || "",
    endTime: event.endTime || "",
  }));

const eventLabel = (event) => {
  if (!event) return "Unassigned";
  const date = event.date ? prettyDate(event.date) : "Date TBD";
  const time =
    event.startTime || event.endTime
      ? `, ${event.startTime ? to12h(event.startTime) : "Start TBD"} - ${
          event.endTime ? to12h(event.endTime) : "End TBD"
        }`
      : "";
  const venue = event.venue ? ` at ${event.venue}` : "";
  return `${event.type || "Event"} on ${date}${time}${venue}`;
};

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

const itemEventLabel = (item = {}, events = []) => {
  const eventMap = new Map(events.map((event) => [event.id, event]));
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

const statusClass = (status = "Processing") =>
  `status-${String(status || "Processing")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")}`;

const formatTimeRange = (event = {}) => {
  const start = event.startTime ? to12h(event.startTime) : "";
  const end = event.endTime ? to12h(event.endTime) : "";
  if (start && end) return `${start} - ${end}`;
  return start || end || "Time TBD";
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
    baseAfterDiscount,
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

const coerceDate = (value) => {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatActivityDate = (value) => {
  const date = coerceDate(value);
  if (!date) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

const buildContactDraft = (inquiry = {}) => ({
  name: inquiry.name || "",
  email: inquiry.email || "",
  phoneNumber: inquiry.phoneNumber || "",
  eventDetails: inquiry.eventDetails || "",
});

const buildFinanceDraft = (inquiry = {}) => {
  const discountType =
    inquiry.discountType === "percent" || inquiry.discountType === "amount"
      ? inquiry.discountType
      : "amount";
  const discountValue =
    inquiry.discountType === "percent"
      ? Number(inquiry.discountValue || 0)
      : inquiry.discount != null
      ? Number(inquiry.discount || 0)
      : Number(inquiry.discountValue || 0) || 0;
  const feeType =
    inquiry.feeType === "percent" || inquiry.feeType === "amount"
      ? inquiry.feeType
      : "amount";

  return {
    discountType,
    discountValue,
    taxPercent: Number(inquiry.taxPercent || 0),
    travelAmount: Number(inquiry.travelAmount || 0),
    feeType,
    feeValue: Number(inquiry.feeValue || 0),
  };
};

export default function AdminEventDetails() {
  const { inquiryId, eventId } = useParams();
  const navigate = useNavigate();
  const [inquiry, setInquiry] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [isEditingSchedule, setIsEditingSchedule] = useState(false);
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [isEditingServices, setIsEditingServices] = useState(false);
  const [scheduleRows, setScheduleRows] = useState([]);
  const [newEventDraft, setNewEventDraft] = useState({
    type: "",
    venue: "",
    date: "",
    startTime: "",
    endTime: "",
  });
  const [statusDraft, setStatusDraft] = useState("Processing");
  const [contactDraft, setContactDraft] = useState(buildContactDraft());
  const [financeDraft, setFinanceDraft] = useState(buildFinanceDraft());
  const [depositDraft, setDepositDraft] = useState({ amount: "", note: "" });
  const [itemDrafts, setItemDrafts] = useState({});
  const [addDraft, setAddDraft] = useState({});
  const [assignSearch, setAssignSearch] = useState("");
  const [assignSelectedUser, setAssignSelectedUser] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [showContract, setShowContract] = useState(false);
  const [activeContract, setActiveContract] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!inquiryId) return undefined;

    const stop = onSnapshot(
      doc(db, "inquiries", inquiryId),
      (snap) => {
        if (!snap.exists()) {
          setInquiry(null);
          setLoadError("This inquiry could not be found.");
          setLoading(false);
          return;
        }
        setInquiry({ id: snap.id, ...snap.data() });
        setLoadError("");
        setLoading(false);
      },
      (error) => {
        console.error("Event detail load failed:", error);
        setLoadError("Could not load this event. Check the console for details.");
        setLoading(false);
      }
    );

    return () => stop();
  }, [inquiryId]);

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
    const usersQuery = query(collection(db, "users"), orderBy("name", "asc"));
    const stop = onSnapshot(
      usersQuery,
      (snap) =>
        setUsers(snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))),
      (error) => console.error("Users load failed:", error)
    );
    return () => stop();
  }, []);

  const events = useMemo(() => normalizeEvents(inquiry?.events), [inquiry]);
  const event = useMemo(
    () => events.find((row) => row.id === eventId),
    [eventId, events]
  );
  const status = inquiry?.status || "Processing";
  const totals = useMemo(() => calcTotals(inquiry || {}), [inquiry]);
  const depositTotal = useMemo(() => sumDeposits(inquiry || {}), [inquiry]);
  const balance = Math.max(0, totals.total - depositTotal);

  useEffect(() => {
    if (!inquiry) return;
    if (!isEditingSchedule) {
      setScheduleRows(cleanEventRows(inquiry.events));
      setStatusDraft(inquiry.status || "Processing");
    }
    if (!isEditingContact) {
      setContactDraft(buildContactDraft(inquiry));
    }
    setFinanceDraft(buildFinanceDraft(inquiry));
    setItemDrafts((current) => {
      const next = { ...current };
      (Array.isArray(inquiry.items) ? inquiry.items : []).forEach(
        (item, index) => {
          if (!next[index]) {
            next[index] = {
              price: item.price ?? 0,
              quantity: item.quantity ?? 1,
            };
          }
        }
      );
      return next;
    });
    if (inquiry.userId) {
      setAssignSelectedUser({
        id: inquiry.userId,
        name: inquiry.userName || "",
        email: inquiry.userEmail || "",
      });
    } else {
      setAssignSelectedUser(null);
    }
  }, [inquiry, isEditingContact, isEditingSchedule]);

  useEffect(() => {
    if (!event || addDraft.eventId) return;
    setAddDraft((current) => ({ ...current, eventId: event.id, quantity: 1 }));
  }, [addDraft.eventId, event]);

  const eventItems = useMemo(() => {
    if (!event) return [];
    return (Array.isArray(inquiry?.items) ? inquiry.items : [])
      .map((item, index) => {
        const allocations = normalizeAllocations(item, events).filter(
          (row) => row.eventId === event.id
        );
        const assignedQuantity = allocations.reduce(
          (sum, row) => sum + row.quantity,
          0
        );
        return {
          ...item,
          sourceIndex: index,
          assignedQuantity,
          lineTotal: Number(item.price || 0) * assignedQuantity,
        };
      })
      .filter((item) => item.assignedQuantity > 0);
  }, [event, events, inquiry?.items]);

  const eventTotalsById = useMemo(() => {
    const totalsById = new Map(events.map((row) => [row.id, 0]));
    (Array.isArray(inquiry?.items) ? inquiry.items : []).forEach((item) => {
      normalizeAllocations(item, events).forEach((allocation) => {
        const lineTotal =
          Number(item.price || 0) * Math.max(0, Number(allocation.quantity || 0));
        totalsById.set(
          allocation.eventId,
          (totalsById.get(allocation.eventId) || 0) + lineTotal
        );
      });
    });
    return totalsById;
  }, [events, inquiry?.items]);

  const eventTotal = eventItems.reduce((sum, item) => sum + item.lineTotal, 0);

  const activityItems = useMemo(() => {
    if (!inquiry) return [];

    const rows = [];
    const inquiryCreated =
      inquiry.timestamp || inquiry.createdAt || inquiry.submittedAt || inquiry.dateCreated;

    if (inquiryCreated) {
      rows.push({
        id: "inquiry-created",
        label: "Inquiry created",
        title: inquiry.name || inquiry.userName || "New inquiry",
        detail: inquiry.email || inquiry.userEmail || "Client inquiry was received.",
        date: inquiryCreated,
      });
    }

    rows.push({
      id: "current-status",
      label: "Status",
      title: status,
      detail: "Current inquiry status",
      date: null,
    });

    if (event) {
      rows.push({
        id: `event-${event.id}`,
        label: "Event scheduled",
        title: event.type || "Scheduled event",
        detail: eventLabel(event),
        date: event.date,
      });
    }

    if (eventItems.length > 0) {
      rows.push({
        id: "event-services",
        label: "Services",
        title: `${eventItems.length} assigned ${
          eventItems.length === 1 ? "service" : "services"
        }`,
        detail: `Assigned service total is ${money(eventTotal)}.`,
        date: null,
      });
    }

    (Array.isArray(inquiry.deposits) ? inquiry.deposits : []).forEach((deposit) => {
      rows.push({
        id: `deposit-${deposit.id || deposit.date || deposit.amount}`,
        label: "Payment",
        title: `${money(deposit.amount)} deposit recorded`,
        detail: deposit.note || "Deposit",
        date: deposit.date,
      });
    });

    (Array.isArray(inquiry.contracts) ? inquiry.contracts : []).forEach((contract) => {
      rows.push({
        id: `contract-${contract.id || contract.title}`,
        label: "Contract",
        title: contract.title || "Contract",
        detail: `${contract.clientSignature ? "Client signed" : "Client pending"} / ${
          contract.adminSignature ? "Admin signed" : "Admin pending"
        }`,
        date: contract.createdAt || contract.date || contract.updatedAt,
      });

      if (contract.clientSignature) {
        rows.push({
          id: `contract-${contract.id || contract.title}-client-signature`,
          label: "Signature",
          title: "Client signature collected",
          detail: contract.title || "Contract",
          date:
            contract.clientSignedAt ||
            contract.clientSignatureDate ||
            contract.updatedAt ||
            contract.createdAt,
        });
      }

      if (contract.adminSignature) {
        rows.push({
          id: `contract-${contract.id || contract.title}-admin-signature`,
          label: "Signature",
          title: "Admin signature completed",
          detail: contract.title || "Contract",
          date:
            contract.adminSignedAt ||
            contract.adminSignatureDate ||
            contract.updatedAt ||
            contract.createdAt,
        });
      }
    });

    return rows.sort((first, second) => {
      const firstTime = coerceDate(first.date)?.getTime() || 0;
      const secondTime = coerceDate(second.date)?.getTime() || 0;
      return secondTime - firstTime;
    });
  }, [event, eventItems, eventTotal, inquiry, status]);

  const tabBadges = {
    services: eventItems.length ? String(eventItems.length) : "",
    payments: balance > 0 ? "Due" : "Paid",
    contracts: inquiry?.contracts?.length ? String(inquiry.contracts.length) : "",
    activity: activityItems.length ? String(activityItems.length) : "",
  };

  const renderRelatedEventDays = () => {
    if (!inquiry || !event || events.length <= 1) return null;

    const sortedEvents = [...events].sort((first, second) => {
      const firstTime = coerceDate(first.date)?.getTime() || Number.MAX_SAFE_INTEGER;
      const secondTime = coerceDate(second.date)?.getTime() || Number.MAX_SAFE_INTEGER;
      return firstTime - secondTime;
    });

    return (
      <section className="admin-event-section admin-event-related-section">
        <div className="admin-event-section-heading">
          <div>
            <span>Inquiry dates</span>
            <h2>Other days for this customer</h2>
          </div>
          <Badge bg="light" text="dark">
            {events.length} dates
          </Badge>
        </div>

        <div className="admin-event-related-list">
          {sortedEvents.map((eventRow) => {
            const isCurrent = eventRow.id === event.id;
            const content = (
              <>
                <div className="admin-event-related-date">
                  <CalendarDays size={18} />
                  <div>
                    <strong>
                      {eventRow.date ? prettyDate(eventRow.date) : "Date TBD"}
                    </strong>
                    <span>{eventRow.type || "Event"}</span>
                  </div>
                </div>
                <div className="admin-event-related-meta">
                  <span>
                    <Clock size={15} />
                    {formatTimeRange(eventRow)}
                  </span>
                  <span>
                    <MapPin size={15} />
                    {eventRow.venue || "Venue TBD"}
                  </span>
                  <span>{money(eventTotalsById.get(eventRow.id) || 0)} services</span>
                </div>
                {isCurrent ? (
                  <Badge bg="primary">Current</Badge>
                ) : (
                  <span className="admin-event-related-open">Open details</span>
                )}
              </>
            );

            return isCurrent ? (
              <div
                key={eventRow.id}
                className="admin-event-related-card is-current"
              >
                {content}
              </div>
            ) : (
              <Link
                key={eventRow.id}
                to={`/dashboard-admin/events/${inquiry.id}/${eventRow.id}`}
                className="admin-event-related-card"
              >
                {content}
              </Link>
            );
          })}
        </div>
      </section>
    );
  };

  const filteredUsers = useMemo(() => {
    const term = assignSearch.trim().toLowerCase();
    if (!term) return [];
    return users
      .filter((user) => {
        const name = String(user?.name || "").toLowerCase();
        const email = String(user?.email || "").toLowerCase();
        const phone = String(user?.phoneNumber || "").toLowerCase();
        return name.includes(term) || email.includes(term) || phone.includes(term);
      })
      .slice(0, 8);
  }, [assignSearch, users]);

  const setScheduleField = (index, key, value) => {
    setScheduleRows((rows) =>
      rows.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [key]: value } : row
      )
    );
  };

  const addScheduleRow = () => {
    if (!newEventDraft.type || !newEventDraft.date) return;
    setScheduleRows((rows) => [
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

  const removeScheduleRow = (index) =>
    setScheduleRows((rows) => rows.filter((_, rowIndex) => rowIndex !== index));

  const saveSchedule = async () => {
    if (!inquiry) return;
    try {
      setSaving(true);
      const cleanRows = cleanEventRows(scheduleRows);
      const eventIds = new Set(cleanRows.map((row) => row.id));
      const cleanItems = (Array.isArray(inquiry.items) ? inquiry.items : []).map(
        (item) => ({
          ...item,
          eventId:
            item.eventId && eventIds.has(item.eventId) ? item.eventId : "",
          eventAllocations: normalizeAllocations(item, cleanRows),
        })
      );
      await updateDoc(doc(db, "inquiries", inquiry.id), {
        events: cleanRows,
        items: cleanItems,
        status: statusDraft,
      });
      setIsEditingSchedule(false);
      if (event && !eventIds.has(event.id)) {
        navigate("/dashboard-admin");
      }
    } catch (error) {
      console.error("Schedule update failed:", error);
      alert("Failed to update the schedule. Check the console for details.");
    } finally {
      setSaving(false);
    }
  };

  const saveContact = async () => {
    if (!inquiry) return;
    try {
      setSaving(true);
      await updateDoc(doc(db, "inquiries", inquiry.id), {
        name: contactDraft.name.trim(),
        email: contactDraft.email.trim(),
        phoneNumber: contactDraft.phoneNumber.trim(),
        eventDetails: contactDraft.eventDetails.trim(),
      });
      setIsEditingContact(false);
    } catch (error) {
      console.error("Contact update failed:", error);
      alert("Failed to update contact details. Check the console for details.");
    } finally {
      setSaving(false);
    }
  };

  const saveUserAssignment = async () => {
    if (!inquiry) return;
    try {
      setSaving(true);
      await updateDoc(doc(db, "inquiries", inquiry.id), {
        userId: assignSelectedUser?.id || "",
        userName: assignSelectedUser?.name || "",
        userEmail: assignSelectedUser?.email || "",
      });
      setAssignSearch("");
    } catch (error) {
      console.error("User assignment failed:", error);
      alert("Failed to update user assignment. Check the console for details.");
    } finally {
      setSaving(false);
    }
  };

  const saveDiscount = async () => {
    if (!inquiry) return;
    const type =
      financeDraft.discountType === "percent" ? "percent" : "amount";
    const valueNum = Number(financeDraft.discountValue || 0);
    const payload =
      type === "percent"
        ? {
            discountType: "percent",
            discountValue: Math.max(0, Math.min(100, valueNum)),
            discount: 0,
          }
        : {
            discountType: "amount",
            discountValue: Math.max(0, valueNum),
            discount: Math.max(0, valueNum),
          };
    try {
      setSaving(true);
      await updateDoc(doc(db, "inquiries", inquiry.id), payload);
    } catch (error) {
      console.error("Discount update failed:", error);
    } finally {
      setSaving(false);
    }
  };

  const saveTax = async () => {
    if (!inquiry) return;
    try {
      setSaving(true);
      await updateDoc(doc(db, "inquiries", inquiry.id), {
        taxPercent: Math.max(
          0,
          Math.min(100, Number(financeDraft.taxPercent || 0))
        ),
      });
    } catch (error) {
      console.error("Tax update failed:", error);
    } finally {
      setSaving(false);
    }
  };

  const saveTravel = async () => {
    if (!inquiry) return;
    try {
      setSaving(true);
      await updateDoc(doc(db, "inquiries", inquiry.id), {
        travelAmount: Math.max(0, Number(financeDraft.travelAmount || 0)),
      });
    } catch (error) {
      console.error("Travel update failed:", error);
    } finally {
      setSaving(false);
    }
  };

  const saveFee = async () => {
    if (!inquiry) return;
    const type = financeDraft.feeType === "percent" ? "percent" : "amount";
    const valueNum = Number(financeDraft.feeValue || 0);
    const payload =
      type === "percent"
        ? {
            feeType: "percent",
            feeValue: Math.max(0, Math.min(100, valueNum)),
          }
        : { feeType: "amount", feeValue: Math.max(0, valueNum) };
    try {
      setSaving(true);
      await updateDoc(doc(db, "inquiries", inquiry.id), payload);
    } catch (error) {
      console.error("Fee update failed:", error);
    } finally {
      setSaving(false);
    }
  };

  const saveItems = async (nextItems) => {
    if (!inquiry) return;
    try {
      setSaving(true);
      const eventIds = new Set(events.map((row) => row.id));
      const clean = nextItems.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description || "",
        price: Number(item.price || 0),
        quantity: Math.max(0, Number(item.quantity || 0)),
        categories: Array.isArray(item.categories) ? item.categories : [],
        media: Array.isArray(item.media) ? item.media : [],
        eventId: item.eventId && eventIds.has(item.eventId) ? item.eventId : "",
        eventAllocations: normalizeAllocations(item, events),
      }));
      await updateDoc(doc(db, "inquiries", inquiry.id), { items: clean });
    } catch (error) {
      console.error("Items update failed:", error);
      alert("Failed to update items. Check the console for details.");
    } finally {
      setSaving(false);
    }
  };

  const setItemDraftField = (index, key, value) => {
    setItemDrafts((drafts) => ({
      ...drafts,
      [index]: {
        ...(drafts[index] || {}),
        [key]: value,
      },
    }));
  };

  const submitItemRow = async (index) => {
    const draft = itemDrafts[index] || {};
    const items = [...(Array.isArray(inquiry?.items) ? inquiry.items : [])];
    const next = { ...items[index] };
    next.price = Number(draft.price || 0);
    next.quantity = Math.max(0, Number(draft.quantity || 0));
    if (draft.eventId != null) {
      next.eventId = draft.eventId;
      next.eventAllocations = draft.eventId
        ? [{ eventId: draft.eventId, quantity: next.quantity }]
        : [];
    }
    if (draft.allocations) {
      next.eventAllocations = Object.entries(draft.allocations)
        .map(([allocationEventId, quantity]) => ({
          eventId: allocationEventId,
          quantity: Math.max(0, Number(quantity || 0)),
        }))
        .filter((row) => row.quantity > 0);
    }
    items[index] = next;
    await saveItems(items);
  };

  const removeItem = async (index) => {
    const items = [...(Array.isArray(inquiry?.items) ? inquiry.items : [])];
    await saveItems(items.filter((_, itemIndex) => itemIndex !== index));
  };

  const handlePickCatalog = (rentalId) => {
    if (rentalId === "__custom__") {
      setAddDraft((current) => ({
        ...current,
        pickId: "__custom__",
        name: "",
        description: "",
        price: "",
        quantity: current.quantity || 1,
        categories: [],
      }));
      return;
    }
    const picked = catalog.find((row) => row.id === rentalId);
    if (!picked) return;
    setAddDraft((current) => ({
      ...current,
      pickId: rentalId,
      name: picked.name || "",
      description: picked.description || "",
      price: picked.price != null ? String(picked.price) : "",
      quantity: current.quantity || 1,
      categories: Array.isArray(picked.categories) ? picked.categories : [],
    }));
  };

  const addItem = async () => {
    if (!addDraft.name) return;
    const picked = catalog.find((row) => row.id === addDraft.pickId);
    const media =
      addDraft.pickId && addDraft.pickId !== "__custom__" && picked
        ? Array.isArray(picked.media)
          ? picked.media
          : []
        : [];
    const quantity = Math.max(1, Number(addDraft.quantity || 1));
    const item = {
      id: crypto.randomUUID?.() || String(Date.now()),
      name: addDraft.name,
      description: addDraft.description || "",
      price: Number(addDraft.price || 0),
      quantity,
      categories: Array.isArray(addDraft.categories) ? addDraft.categories : [],
      media,
      eventId: addDraft.eventId || "",
      eventAllocations: addDraft.eventId
        ? [{ eventId: addDraft.eventId, quantity }]
        : [],
    };
    await saveItems([...(Array.isArray(inquiry?.items) ? inquiry.items : []), item]);
    setAddDraft({ eventId: event?.id || "", quantity: 1 });
    setIsEditingServices(false);
  };

  const addDeposit = async () => {
    if (!inquiry) return;
    const amount = Number(depositDraft.amount || 0);
    if (amount <= 0) return;
    const next = [
      ...(Array.isArray(inquiry.deposits) ? inquiry.deposits : []),
      {
        id: crypto.randomUUID?.() || String(Date.now()),
        amount,
        note: String(depositDraft.note || ""),
        date: new Date().toISOString(),
        addedBy: "admin",
      },
    ];
    try {
      setSaving(true);
      await updateDoc(doc(db, "inquiries", inquiry.id), { deposits: next });
      setDepositDraft({ amount: "", note: "" });
    } catch (error) {
      console.error("Add deposit failed:", error);
    } finally {
      setSaving(false);
    }
  };

  const removeDeposit = async (depositId) => {
    if (!inquiry) return;
    const next = (Array.isArray(inquiry.deposits) ? inquiry.deposits : []).filter(
      (deposit) => deposit.id !== depositId
    );
    try {
      setSaving(true);
      await updateDoc(doc(db, "inquiries", inquiry.id), { deposits: next });
    } catch (error) {
      console.error("Remove deposit failed:", error);
    } finally {
      setSaving(false);
    }
  };

  const openAddContract = () => {
    setActiveContract(null);
    setShowContract(true);
  };

  const openViewContract = (contract) => {
    setActiveContract(contract);
    setShowContract(true);
  };

  const removeContract = async (contractId) => {
    if (!inquiry) return;
    try {
      setSaving(true);
      const next = (Array.isArray(inquiry.contracts) ? inquiry.contracts : []).filter(
        (contract) => contract.id !== contractId
      );
      await updateDoc(doc(db, "inquiries", inquiry.id), { contracts: next });
    } catch (error) {
      console.error("Remove contract failed:", error);
    } finally {
      setSaving(false);
    }
  };

  const deleteInquiry = async () => {
    if (!inquiry) return;
    try {
      setSaving(true);
      await deleteDoc(doc(db, "inquiries", inquiry.id));
      navigate("/dashboard-admin");
    } catch (error) {
      console.error("Delete inquiry failed:", error);
      alert("Failed to delete this inquiry. Check the console for details.");
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center py-5">
        <Spinner animation="border" />
      </div>
    );
  }

  if (loadError || !event) {
    return (
      <Container className="admin-event-detail py-4">
        <Link to="/dashboard-admin" className="admin-back-link">
          <ArrowLeft size={17} />
          Back to dashboard
        </Link>
        <div className="admin-dashboard-empty mt-3">
          {loadError || "This event could not be found."}
        </div>
      </Container>
    );
  }

  return (
    <Container fluid="xl" className="admin-event-detail py-3">
      <div className="admin-event-detail-hero">
        <div>
          <button
            type="button"
            className="admin-back-link as-button"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={17} />
            Back
          </button>
          <div className="admin-dashboard-kicker mt-3">
            <CalendarDays size={16} />
            Event details
          </div>
          <h1>{event.type || "Scheduled event"}</h1>
          <p>
            {inquiry?.name || inquiry?.userName || "Unknown client"} on{" "}
            {event.date ? prettyDate(event.date) : "date TBD"}
          </p>
        </div>

        <div className="admin-event-detail-actions">
          <span className={`admin-status-badge ${statusClass(status)}`}>
            {status}
          </span>
          {isEditingSchedule ? (
            <>
              <Button
                type="button"
                variant="outline-light"
                onClick={() => {
                  setScheduleRows(cleanEventRows(inquiry.events));
                  setStatusDraft(status);
                  setIsEditingSchedule(false);
                }}
                disabled={saving}
              >
                <X size={17} />
                Cancel
              </Button>
              <Button type="button" variant="light" onClick={saveSchedule} disabled={saving}>
                <Check size={17} />
                {saving ? "Saving" : "Save schedule"}
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="light"
              onClick={() => {
                setActiveTab("overview");
                setIsEditingSchedule(true);
              }}
            >
              <Edit3 size={17} />
              Edit event
            </Button>
          )}
        </div>
      </div>

      <div className="admin-event-tabs" role="tablist" aria-label="Event detail sections">
        {EVENT_DETAIL_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.key}
            className={activeTab === tab.key ? "is-active" : ""}
            onClick={() => setActiveTab(tab.key)}
          >
            <span>{tab.label}</span>
            {tabBadges[tab.key] ? (
              <small>{tabBadges[tab.key]}</small>
            ) : null}
          </button>
        ))}
      </div>

      <Row className="g-3 align-items-start">
        <Col xl={activeTab === "overview" ? 8 : 12}>
          <section
            className={`admin-event-section admin-event-schedule-section ${
              activeTab === "overview" ? "" : "d-none"
            }`}
          >
            <div className="admin-event-section-heading">
              <div>
                <span>Schedule</span>
                <h2>Timing, venue, and status</h2>
              </div>
            </div>

            {isEditingSchedule ? (
              <div className="admin-event-schedule-editor">
                <Row className="g-3 mb-3">
                  <Col md={5}>
                    <Form.Label>Status</Form.Label>
                    <Form.Select
                      value={statusDraft}
                      onChange={(changeEvent) => setStatusDraft(changeEvent.target.value)}
                      disabled={saving}
                    >
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </Form.Select>
                  </Col>
                </Row>

                {scheduleRows.map((row, index) => (
                  <div
                    key={row.id || index}
                    className={`admin-event-schedule-row ${
                      row.id === event.id ? "is-current" : ""
                    }`}
                  >
                    <Row className="g-2 align-items-end">
                      <Col md={3}>
                        <Form.Label>Type</Form.Label>
                        <Form.Control
                          value={row.type || ""}
                          onChange={(changeEvent) =>
                            setScheduleField(index, "type", changeEvent.target.value)
                          }
                          disabled={saving}
                        />
                      </Col>
                      <Col md={3}>
                        <Form.Label>Venue</Form.Label>
                        <Form.Control
                          value={row.venue || ""}
                          onChange={(changeEvent) =>
                            setScheduleField(index, "venue", changeEvent.target.value)
                          }
                          disabled={saving}
                        />
                      </Col>
                      <Col md={2}>
                        <Form.Label>Date</Form.Label>
                        <Form.Control
                          type="date"
                          value={row.date || ""}
                          onChange={(changeEvent) =>
                            setScheduleField(index, "date", changeEvent.target.value)
                          }
                          disabled={saving}
                        />
                      </Col>
                      <Col md={2}>
                        <Form.Label>Start</Form.Label>
                        <Form.Control
                          type="time"
                          value={row.startTime || ""}
                          onChange={(changeEvent) =>
                            setScheduleField(
                              index,
                              "startTime",
                              changeEvent.target.value
                            )
                          }
                          disabled={saving}
                        />
                      </Col>
                      <Col md={2}>
                        <Form.Label>End</Form.Label>
                        <Form.Control
                          type="time"
                          value={row.endTime || ""}
                          onChange={(changeEvent) =>
                            setScheduleField(index, "endTime", changeEvent.target.value)
                          }
                          disabled={saving}
                        />
                      </Col>
                      <Col xs={12} className="d-flex justify-content-end">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline-danger"
                          onClick={() => removeScheduleRow(index)}
                          disabled={saving}
                        >
                          <Trash2 size={15} />
                          Remove
                        </Button>
                      </Col>
                    </Row>
                  </div>
                ))}

                <div className="admin-event-add-box">
                  <div className="fw-semibold mb-2">Add event date</div>
                  <Row className="g-2 align-items-end">
                    <Col md={3}>
                      <Form.Label>Type</Form.Label>
                      <Form.Control
                        value={newEventDraft.type}
                        onChange={(changeEvent) =>
                          setNewEventDraft((current) => ({
                            ...current,
                            type: changeEvent.target.value,
                          }))
                        }
                        disabled={saving}
                      />
                    </Col>
                    <Col md={3}>
                      <Form.Label>Venue</Form.Label>
                      <Form.Control
                        value={newEventDraft.venue}
                        onChange={(changeEvent) =>
                          setNewEventDraft((current) => ({
                            ...current,
                            venue: changeEvent.target.value,
                          }))
                        }
                        disabled={saving}
                      />
                    </Col>
                    <Col md={2}>
                      <Form.Label>Date</Form.Label>
                      <Form.Control
                        type="date"
                        value={newEventDraft.date}
                        onChange={(changeEvent) =>
                          setNewEventDraft((current) => ({
                            ...current,
                            date: changeEvent.target.value,
                          }))
                        }
                        disabled={saving}
                      />
                    </Col>
                    <Col md={2}>
                      <Form.Label>Start</Form.Label>
                      <Form.Control
                        type="time"
                        value={newEventDraft.startTime}
                        onChange={(changeEvent) =>
                          setNewEventDraft((current) => ({
                            ...current,
                            startTime: changeEvent.target.value,
                          }))
                        }
                        disabled={saving}
                      />
                    </Col>
                    <Col md={2}>
                      <Form.Label>End</Form.Label>
                      <Form.Control
                        type="time"
                        value={newEventDraft.endTime}
                        onChange={(changeEvent) =>
                          setNewEventDraft((current) => ({
                            ...current,
                            endTime: changeEvent.target.value,
                          }))
                        }
                        disabled={saving}
                      />
                    </Col>
                    <Col xs={12} className="d-flex justify-content-end">
                      <Button
                        type="button"
                        size="sm"
                        onClick={addScheduleRow}
                        disabled={saving || !newEventDraft.type || !newEventDraft.date}
                      >
                        <Plus size={15} />
                        Add event date
                      </Button>
                    </Col>
                  </Row>
                </div>
              </div>
            ) : (
              <div className="admin-event-detail-grid">
                <div>
                  <CalendarDays size={20} />
                  <span>Date</span>
                  <strong>{event.date ? prettyDate(event.date) : "Date TBD"}</strong>
                </div>
                <div>
                  <Clock size={20} />
                  <span>Time</span>
                  <strong>{formatTimeRange(event)}</strong>
                </div>
                <div>
                  <MapPin size={20} />
                  <span>Venue</span>
                  <strong>{event.venue || "Venue TBD"}</strong>
                </div>
              </div>
            )}
          </section>

          {activeTab === "overview" ? renderRelatedEventDays() : null}

          <section
            className={`admin-event-section ${
              activeTab === "itinerary" ? "" : "d-none"
            }`}
          >
            <div className="admin-event-section-heading">
              <div>
                <span>Itinerary</span>
                <h2>Run of show</h2>
              </div>
            </div>
            <InquiryItineraries inquiry={inquiry} mode="admin" />
          </section>

          {activeTab === "services" ? renderRelatedEventDays() : null}

          <section
            className={`admin-event-section ${
              activeTab === "services" ? "" : "d-none"
            }`}
          >
            <div className="admin-event-section-heading">
              <div>
                <span>Services</span>
                <h2>
                  {isEditingServices
                    ? "Items, catalog, and event assignment"
                    : "Assigned services"}
                </h2>
              </div>
              <div className="admin-event-section-actions">
                <Badge bg="light" text="dark">
                  This event {money(eventTotal)}
                </Badge>
                {isEditingServices ? (
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
                    <Edit3 size={15} />
                    Edit services
                  </Button>
                )}
              </div>
            </div>

            {!isEditingServices ? (
              eventItems.length === 0 ? (
                <div className="admin-event-empty">
                  No services are assigned to this event yet.
                  <div className="mt-2">
                    <Button
                      size="sm"
                      variant="outline-primary"
                      onClick={() => setIsEditingServices(true)}
                    >
                      <Plus size={15} />
                      Add services
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="admin-event-services-read">
                  {eventItems.map((item, index) => (
                    <article key={`${item.id || item.name}-${index}`}>
                      <div className="admin-event-service-icon">
                        <Package size={20} />
                      </div>
                      <div className="admin-event-service-main">
                        <div className="admin-event-service-topline">
                          <h3>{item.name || "Unnamed service"}</h3>
                          <strong>{money(item.lineTotal)}</strong>
                        </div>
                        {item.description ? <p>{item.description}</p> : null}
                        <div className="admin-event-service-meta">
                          <span>Qty {item.assignedQuantity}</span>
                          <span>{money(item.price)} each</span>
                          <span>{eventLabel(event)}</span>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )
            ) : (
              <div className="admin-event-items-editor">
              {(Array.isArray(inquiry?.items) ? inquiry.items : []).length === 0 ? (
                <div className="admin-event-empty">No items yet.</div>
              ) : (
                (inquiry.items || []).map((item, index) => {
                  const draft = itemDrafts[index] || {};
                  const totalQty = Math.max(
                    0,
                    Number(draft.quantity ?? item.quantity ?? 0)
                  );
                  const allocations = normalizeAllocations(item, events);
                  const draftAllocations = draft.allocations || {};
                  const lineTotal =
                    Number(draft.price ?? item.price ?? 0) *
                    Number(draft.quantity ?? item.quantity ?? 0);

                  return (
                    <div key={`${item.id || item.name}-${index}`} className="admin-event-item-editor">
                      <div>
                        <div className="admin-event-item-icon">
                          <Package size={18} />
                        </div>
                      </div>
                      <div className="admin-event-item-editor-body">
                        <div className="admin-event-item-editor-title">
                          <strong>{item.name || "Unnamed item"}</strong>
                          <span>{itemEventLabel(item, events)}</span>
                        </div>
                        {item.description ? <p>{item.description}</p> : null}
                        <Row className="g-2 align-items-end">
                          {events.length > 0 ? (
                            <Col md={12}>
                              <Form.Label className="mb-1">
                                {totalQty > 1 ? "Quantity by event" : "Event"}
                              </Form.Label>
                              {totalQty > 1 ? (
                                <Row className="g-2">
                                  {events.map((eventRow) => {
                                    const fallback =
                                      allocations.find(
                                        (row) => row.eventId === eventRow.id
                                      )?.quantity || "";
                                    return (
                                      <Col md={6} key={eventRow.id}>
                                        <div className="small text-muted">
                                          {eventLabel(eventRow)}
                                        </div>
                                        <Form.Control
                                          type="number"
                                          min="0"
                                          max={totalQty}
                                          inputMode="numeric"
                                          value={
                                            draftAllocations[eventRow.id] ?? fallback
                                          }
                                          placeholder="0"
                                          onChange={(changeEvent) =>
                                            setItemDraftField(index, "allocations", {
                                              ...draftAllocations,
                                              [eventRow.id]: changeEvent.target.value,
                                            })
                                          }
                                          disabled={saving}
                                        />
                                      </Col>
                                    );
                                  })}
                                </Row>
                              ) : (
                                <Form.Select
                                  value={
                                    draft.eventId ??
                                    item.eventId ??
                                    allocations[0]?.eventId ??
                                    ""
                                  }
                                  onChange={(changeEvent) =>
                                    setItemDraftField(
                                      index,
                                      "eventId",
                                      changeEvent.target.value
                                    )
                                  }
                                  disabled={saving}
                                >
                                  <option value="">Applies generally / unassigned</option>
                                  {events.map((eventRow) => (
                                    <option key={eventRow.id} value={eventRow.id}>
                                      {eventLabel(eventRow)}
                                    </option>
                                  ))}
                                </Form.Select>
                              )}
                            </Col>
                          ) : null}
                          <Col md={4}>
                            <Form.Label className="mb-1">Price</Form.Label>
                            <InputGroup>
                              <InputGroup.Text>$</InputGroup.Text>
                              <Form.Control
                                inputMode="decimal"
                                value={draft.price ?? item.price ?? ""}
                                onChange={(changeEvent) =>
                                  setItemDraftField(index, "price", changeEvent.target.value)
                                }
                                disabled={saving}
                              />
                            </InputGroup>
                          </Col>
                          <Col md={3}>
                            <Form.Label className="mb-1">Quantity</Form.Label>
                            <Form.Control
                              inputMode="numeric"
                              value={draft.quantity ?? item.quantity ?? ""}
                              onChange={(changeEvent) =>
                                setItemDraftField(index, "quantity", changeEvent.target.value)
                              }
                              disabled={saving}
                            />
                          </Col>
                          <Col md={5} className="admin-event-item-editor-actions">
                            <span>{money(lineTotal)}</span>
                            <Button
                              size="sm"
                              onClick={() => submitItemRow(index)}
                              disabled={saving}
                            >
                              Update
                            </Button>
                            <Button
                              size="sm"
                              variant="outline-danger"
                              onClick={() => removeItem(index)}
                              disabled={saving}
                            >
                              Remove
                            </Button>
                          </Col>
                        </Row>
                      </div>
                    </div>
                  );
                })
              )}
              </div>
            )}

            {isEditingServices ? (
              <div className="admin-event-add-box mt-3">
              <div className="fw-semibold mb-2">Add item</div>
              <Row className="g-2 align-items-end">
                <Col lg={4}>
                  <Form.Label>Pick from catalog</Form.Label>
                  <Form.Select
                    value={addDraft.pickId || ""}
                    onChange={(changeEvent) => handlePickCatalog(changeEvent.target.value)}
                    disabled={saving}
                  >
                    <option value="">Choose an item</option>
                    {renderCatalogOptionGroups(catalog)}
                    <option value="__custom__">Custom item</option>
                  </Form.Select>
                </Col>
                <Col lg={4}>
                  <Form.Label>Name</Form.Label>
                  <Form.Control
                    value={addDraft.name || ""}
                    onChange={(changeEvent) =>
                      setAddDraft((current) => ({ ...current, name: changeEvent.target.value }))
                    }
                    disabled={saving}
                  />
                </Col>
                <Col lg={4}>
                  <Form.Label>Description</Form.Label>
                  <Form.Control
                    value={addDraft.description || ""}
                    onChange={(changeEvent) =>
                      setAddDraft((current) => ({
                        ...current,
                        description: changeEvent.target.value,
                      }))
                    }
                    disabled={saving}
                  />
                </Col>
                <Col md={3}>
                  <Form.Label>Price</Form.Label>
                  <InputGroup>
                    <InputGroup.Text>$</InputGroup.Text>
                    <Form.Control
                      inputMode="decimal"
                      value={addDraft.price || ""}
                      onChange={(changeEvent) =>
                        setAddDraft((current) => ({
                          ...current,
                          price: changeEvent.target.value,
                        }))
                      }
                      disabled={saving}
                    />
                  </InputGroup>
                </Col>
                <Col md={2}>
                  <Form.Label>Qty</Form.Label>
                  <Form.Control
                    inputMode="numeric"
                    value={addDraft.quantity || ""}
                    onChange={(changeEvent) =>
                      setAddDraft((current) => ({
                        ...current,
                        quantity: changeEvent.target.value,
                      }))
                    }
                    disabled={saving}
                  />
                </Col>
                <Col md={5}>
                  <Form.Label>Event</Form.Label>
                  <Form.Select
                    value={addDraft.eventId || ""}
                    onChange={(changeEvent) =>
                      setAddDraft((current) => ({
                        ...current,
                        eventId: changeEvent.target.value,
                      }))
                    }
                    disabled={saving}
                  >
                    <option value="">Applies generally / unassigned</option>
                    {events.map((eventRow) => (
                      <option key={eventRow.id} value={eventRow.id}>
                        {eventLabel(eventRow)}
                      </option>
                    ))}
                  </Form.Select>
                </Col>
                <Col md={2}>
                  <Button
                    className="w-100"
                    onClick={addItem}
                    disabled={saving || !addDraft.name}
                  >
                    <Plus size={15} />
                    Add
                  </Button>
                </Col>
              </Row>
              </div>
            ) : null}
          </section>

          <section
            className={`admin-event-section ${
              activeTab === "payments" ? "" : "d-none"
            }`}
          >
            <div className="admin-event-section-heading">
              <div>
                <span>Charges</span>
                <h2>Discounts, tax, travel, and fees</h2>
              </div>
              <Badge bg="light" text="dark">
                Total {money(totals.total)}
              </Badge>
            </div>

            <Row className="g-2 align-items-end">
              <Col md={4}>
                <Form.Label>Discount type</Form.Label>
                <Form.Select
                  value={financeDraft.discountType}
                  onChange={(changeEvent) =>
                    setFinanceDraft((current) => ({
                      ...current,
                      discountType: changeEvent.target.value,
                    }))
                  }
                  disabled={saving}
                >
                  <option value="amount">Amount, $</option>
                  <option value="percent">Percent, %</option>
                </Form.Select>
              </Col>
              <Col md={4}>
                <Form.Label>Discount value</Form.Label>
                <Form.Control
                  inputMode="decimal"
                  value={financeDraft.discountValue}
                  onChange={(changeEvent) =>
                    setFinanceDraft((current) => ({
                      ...current,
                      discountValue: changeEvent.target.value,
                    }))
                  }
                  disabled={saving}
                />
              </Col>
              <Col md={4}>
                <Button className="w-100" onClick={saveDiscount} disabled={saving}>
                  Save discount
                </Button>
              </Col>

              <Col md={4}>
                <Form.Label>Tax percent</Form.Label>
                <InputGroup>
                  <Form.Control
                    inputMode="decimal"
                    value={financeDraft.taxPercent}
                    onChange={(changeEvent) =>
                      setFinanceDraft((current) => ({
                        ...current,
                        taxPercent: changeEvent.target.value,
                      }))
                    }
                    disabled={saving}
                  />
                  <InputGroup.Text>%</InputGroup.Text>
                </InputGroup>
              </Col>
              <Col md={2}>
                <Button className="w-100" onClick={saveTax} disabled={saving}>
                  Save
                </Button>
              </Col>
              <Col md={4}>
                <Form.Label>Travel amount</Form.Label>
                <InputGroup>
                  <InputGroup.Text>$</InputGroup.Text>
                  <Form.Control
                    inputMode="decimal"
                    value={financeDraft.travelAmount}
                    onChange={(changeEvent) =>
                      setFinanceDraft((current) => ({
                        ...current,
                        travelAmount: changeEvent.target.value,
                      }))
                    }
                    disabled={saving}
                  />
                </InputGroup>
              </Col>
              <Col md={2}>
                <Button className="w-100" onClick={saveTravel} disabled={saving}>
                  Save
                </Button>
              </Col>

              <Col md={4}>
                <Form.Label>Processing fee type</Form.Label>
                <Form.Select
                  value={financeDraft.feeType}
                  onChange={(changeEvent) =>
                    setFinanceDraft((current) => ({
                      ...current,
                      feeType: changeEvent.target.value,
                    }))
                  }
                  disabled={saving}
                >
                  <option value="amount">Amount, $</option>
                  <option value="percent">Percent, %</option>
                </Form.Select>
              </Col>
              <Col md={4}>
                <Form.Label>Processing fee value</Form.Label>
                <Form.Control
                  inputMode="decimal"
                  value={financeDraft.feeValue}
                  onChange={(changeEvent) =>
                    setFinanceDraft((current) => ({
                      ...current,
                      feeValue: changeEvent.target.value,
                    }))
                  }
                  disabled={saving}
                />
              </Col>
              <Col md={4}>
                <Button className="w-100" onClick={saveFee} disabled={saving}>
                  Save fee
                </Button>
              </Col>
            </Row>

            <div className="admin-event-total-box">
              <div>
                <span>Subtotal</span>
                <strong>{money(totals.subtotal)}</strong>
              </div>
              <div>
                <span>Discount</span>
                <strong>{money(totals.discountApplied)}</strong>
              </div>
              <div>
                <span>Processing fee</span>
                <strong>{money(totals.feeApplied)}</strong>
              </div>
              <div>
                <span>Travel</span>
                <strong>{money(totals.travel)}</strong>
              </div>
              <div>
                <span>Tax</span>
                <strong>{money(totals.taxApplied)}</strong>
              </div>
              <div>
                <span>Total</span>
                <strong>{money(totals.total)}</strong>
              </div>
            </div>
          </section>

          <section
            className={`admin-event-section ${
              activeTab === "payments" ? "" : "d-none"
            }`}
          >
            <div className="admin-event-section-heading">
              <div>
                <span>Deposits</span>
                <h2>Payments and balance</h2>
              </div>
              <Badge bg={balance > 0 ? "warning" : "success"} text={balance > 0 ? "dark" : undefined}>
                Due {money(balance)}
              </Badge>
            </div>

            {(Array.isArray(inquiry?.deposits) ? inquiry.deposits : []).length === 0 ? (
              <div className="admin-event-empty">No deposits yet.</div>
            ) : (
              <div className="admin-event-deposit-list">
                {inquiry.deposits.map((deposit) => (
                  <div key={deposit.id}>
                    <div>
                      <strong>{money(deposit.amount)}</strong>
                      <span>
                        {deposit.note || "Deposit"}
                        {deposit.date ? `, ${prettyDateTimeMMDDYY(deposit.date)}` : ""}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline-danger"
                      onClick={() => removeDeposit(deposit.id)}
                      disabled={saving}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <Row className="g-2 align-items-end mt-2">
              <Col md={3}>
                <Form.Label>Amount</Form.Label>
                <InputGroup>
                  <InputGroup.Text>$</InputGroup.Text>
                  <Form.Control
                    inputMode="decimal"
                    value={depositDraft.amount}
                    onChange={(changeEvent) =>
                      setDepositDraft((current) => ({
                        ...current,
                        amount: changeEvent.target.value,
                      }))
                    }
                    disabled={saving}
                  />
                </InputGroup>
              </Col>
              <Col md={6}>
                <Form.Label>Note</Form.Label>
                <Form.Control
                  value={depositDraft.note}
                  onChange={(changeEvent) =>
                    setDepositDraft((current) => ({
                      ...current,
                      note: changeEvent.target.value,
                    }))
                  }
                  disabled={saving}
                />
              </Col>
              <Col md={3}>
                <Button className="w-100" onClick={addDeposit} disabled={saving}>
                  Add deposit
                </Button>
              </Col>
            </Row>

            <div className="admin-event-total-box compact">
              <div>
                <span>Total deposits</span>
                <strong>{money(depositTotal)}</strong>
              </div>
              <div>
                <span>Balance after deposits</span>
                <strong>{money(balance)}</strong>
              </div>
            </div>
          </section>

          <section
            className={`admin-event-section ${
              activeTab === "contracts" ? "" : "d-none"
            }`}
          >
            <div className="admin-event-section-heading">
              <div>
                <span>Contracts</span>
                <h2>Agreements and signatures</h2>
              </div>
              <Button size="sm" variant="outline-primary" onClick={openAddContract}>
                Add contract
              </Button>
            </div>

            {(Array.isArray(inquiry?.contracts) ? inquiry.contracts : []).length === 0 ? (
              <div className="admin-event-empty">No contracts yet.</div>
            ) : (
              <div className="admin-event-contract-list">
                {inquiry.contracts.map((contract) => (
                  <div key={contract.id}>
                    <div>
                      <strong>{contract.title}</strong>
                      <span>
                        {contract.clientSignature ? "Client signed" : "Client pending"} /{" "}
                        {contract.adminSignature ? "Admin signed" : "Admin pending"}
                      </span>
                    </div>
                    <div>
                      <Button size="sm" variant="outline-secondary" onClick={() => openViewContract(contract)}>
                        View
                      </Button>
                      <Button size="sm" onClick={() => openViewContract(contract)}>
                        Sign as admin
                      </Button>
                      <Button
                        size="sm"
                        variant="outline-danger"
                        onClick={() => removeContract(contract.id)}
                        disabled={saving}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section
            className={`admin-event-section ${
              activeTab === "activity" ? "" : "d-none"
            }`}
          >
            <div className="admin-event-section-heading">
              <div>
                <span>Activity</span>
                <h2>Recent event movement</h2>
              </div>
            </div>

            {activityItems.length === 0 ? (
              <div className="admin-event-empty">No activity has been recorded yet.</div>
            ) : (
              <div className="admin-event-activity-list">
                {activityItems.map((item) => (
                  <article key={item.id} className="admin-event-activity-item">
                    <div className="admin-event-activity-marker" />
                    <div>
                      <div className="admin-event-activity-topline">
                        <span>{item.label}</span>
                        {item.date ? <time>{formatActivityDate(item.date)}</time> : null}
                      </div>
                      <strong>{item.title}</strong>
                      {item.detail ? <p>{item.detail}</p> : null}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </Col>

        <Col xl={4} className={activeTab === "overview" ? "" : "d-none"}>
          <section className="admin-event-section">
            <div className="admin-event-section-heading">
              <div>
                <span>Client</span>
                <h2>Contact details</h2>
              </div>
              {isEditingContact ? (
                <div className="admin-event-small-actions">
                  <Button
                    size="sm"
                    variant="outline-secondary"
                    onClick={() => {
                      setContactDraft(buildContactDraft(inquiry));
                      setIsEditingContact(false);
                    }}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button size="sm" onClick={saveContact} disabled={saving}>
                    Save
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="outline-primary" onClick={() => setIsEditingContact(true)}>
                  Edit
                </Button>
              )}
            </div>

            {isEditingContact ? (
              <Row className="g-2">
                <Col xs={12}>
                  <Form.Label>Name</Form.Label>
                  <Form.Control
                    value={contactDraft.name}
                    onChange={(changeEvent) =>
                      setContactDraft((current) => ({
                        ...current,
                        name: changeEvent.target.value,
                      }))
                    }
                    disabled={saving}
                  />
                </Col>
                <Col xs={12}>
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    value={contactDraft.email}
                    onChange={(changeEvent) =>
                      setContactDraft((current) => ({
                        ...current,
                        email: changeEvent.target.value,
                      }))
                    }
                    disabled={saving}
                  />
                </Col>
                <Col xs={12}>
                  <Form.Label>Phone</Form.Label>
                  <Form.Control
                    value={contactDraft.phoneNumber}
                    onChange={(changeEvent) =>
                      setContactDraft((current) => ({
                        ...current,
                        phoneNumber: changeEvent.target.value,
                      }))
                    }
                    disabled={saving}
                  />
                </Col>
                <Col xs={12}>
                  <Form.Label>Inquiry notes</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={4}
                    value={contactDraft.eventDetails}
                    onChange={(changeEvent) =>
                      setContactDraft((current) => ({
                        ...current,
                        eventDetails: changeEvent.target.value,
                      }))
                    }
                    disabled={saving}
                  />
                </Col>
              </Row>
            ) : (
              <>
                <div className="admin-event-contact-list">
                  <div>
                    <UserRound size={18} />
                    <span>{inquiry?.name || inquiry?.userName || "Unknown client"}</span>
                  </div>
                  {inquiry?.email || inquiry?.userEmail ? (
                    <a href={`mailto:${inquiry.email || inquiry.userEmail}`}>
                      <Mail size={18} />
                      <span>{inquiry.email || inquiry.userEmail}</span>
                    </a>
                  ) : null}
                  {inquiry?.phoneNumber ? (
                    <a href={`tel:${inquiry.phoneNumber}`}>
                      <Phone size={18} />
                      <span>{inquiry.phoneNumber}</span>
                    </a>
                  ) : null}
                </div>
                {inquiry?.eventDetails ? (
                  <div className="admin-event-notes">
                    <span>Inquiry notes</span>
                    <p>{inquiry.eventDetails}</p>
                  </div>
                ) : null}
              </>
            )}
          </section>

          <section className="admin-event-section">
            <div className="admin-event-section-heading">
              <div>
                <span>User</span>
                <h2>Account assignment</h2>
              </div>
            </div>
            <div className="admin-event-assignment">
              {assignSelectedUser?.id ? (
                <div className="admin-event-assigned-user">
                  <UserPlus size={18} />
                  <span>
                    <strong>{assignSelectedUser.name || "User"}</strong>
                    {assignSelectedUser.email ? `, ${assignSelectedUser.email}` : ""}
                  </span>
                </div>
              ) : (
                <div className="text-muted small">No user assigned.</div>
              )}
              <InputGroup>
                <Form.Control
                  placeholder="Search users by name, email, or phone"
                  value={assignSearch}
                  onChange={(changeEvent) => setAssignSearch(changeEvent.target.value)}
                  disabled={saving}
                />
                <Button
                  variant="outline-secondary"
                  onClick={() => {
                    setAssignSelectedUser(null);
                    setAssignSearch("");
                  }}
                  disabled={saving}
                >
                  Clear
                </Button>
              </InputGroup>
              {assignSearch.trim() ? (
                <div className="admin-event-user-results">
                  {filteredUsers.length === 0 ? (
                    <div className="text-muted small">No matches.</div>
                  ) : (
                    filteredUsers.map((user) => (
                      <button
                        type="button"
                        key={user.id}
                        onClick={() => {
                          setAssignSelectedUser({
                            id: user.id,
                            name: user.name,
                            email: user.email,
                          });
                          setAssignSearch("");
                        }}
                        disabled={saving}
                      >
                        <strong>{user.name || "Unnamed user"}</strong>
                        <span>
                          {user.email || "No email"}
                          {user.phoneNumber ? `, ${user.phoneNumber}` : ""}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              ) : null}
              <Button onClick={saveUserAssignment} disabled={saving}>
                Save assignment
              </Button>
            </div>
          </section>

          <section className="admin-event-section">
            <div className="admin-event-section-heading">
              <div>
                <span>Summary</span>
                <h2>Current event</h2>
              </div>
            </div>
            <div className="admin-event-detail-grid single">
              <div>
                <DollarSign size={20} />
                <span>Assigned services</span>
                <strong>{money(eventTotal)}</strong>
              </div>
              <div>
                <FileText size={20} />
                <span>Contracts</span>
                <strong>{(inquiry.contracts || []).length}</strong>
              </div>
            </div>
          </section>

          <section className="admin-event-section">
            <div className="admin-event-section-heading">
              <div>
                <span>Admin</span>
                <h2>Quick links</h2>
              </div>
            </div>
            <div className="admin-event-link-list">
              <Link to="/dashboard-admin">Dashboard calendar</Link>
              <Link to="/inquiries-admin">All inquiries</Link>
              <Link to={`/inquiries/${inquiry.id}/events/${event.id}/itinerary`}>
                Edit itinerary
              </Link>
              <Link to={`/inquiries/${inquiry.id}/events/${event.id}/itinerary/print`}>
                Print itinerary
              </Link>
              <button type="button" onClick={() => setShowDeleteConfirm(true)}>
                Delete inquiry
              </button>
            </div>
          </section>
        </Col>
      </Row>

      <ContractModal
        show={showContract}
        onHide={() => setShowContract(false)}
        inquiry={inquiry}
        contract={activeContract}
        mode="admin"
      />

      <Modal show={showDeleteConfirm} onHide={() => setShowDeleteConfirm(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Delete inquiry</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Delete this inquiry permanently? This cannot be undone.
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="outline-secondary"
            onClick={() => setShowDeleteConfirm(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button variant="danger" onClick={deleteInquiry} disabled={saving}>
            Delete
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
