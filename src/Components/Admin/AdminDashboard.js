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
import { Link } from "react-router-dom";
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import {
  CalendarPlus,
  CalendarCheck,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  ListFilter,
  MapPin,
  Plus,
  Search,
  Trash2,
  UsersRound,
} from "lucide-react";
import db, { functions as firebaseFunctions } from "../../api/firestore/firestore";
import { buildIcsCalendar, downloadIcsFile } from "../../utils/calendar";
import { prettyDate, to12h } from "../../utils/formatters";

const STATUS_OPTIONS = [
  "Processing",
  "Pending",
  "Approved",
  "Confirmed",
  "Rejected",
  "Cancelled",
  "Completed",
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const normalizeEvents = (events = []) =>
  (Array.isArray(events) ? events : []).map((event, index) => ({
    ...event,
    id: event?.id || `event-${index}`,
  }));

const serviceNamesForEvent = (inquiry = {}, event = {}, events = []) => {
  const items = Array.isArray(inquiry.items) ? inquiry.items : [];
  const hasMultipleEvents = events.length > 1;
  const names = items
    .filter((item) => {
      const allocations = Array.isArray(item.eventAllocations)
        ? item.eventAllocations
        : [];
      const assignedByAllocation = allocations.some(
        (row) => row.eventId === event.id && Number(row.quantity || 0) > 0
      );
      const assignedByLegacyEventId = item.eventId && item.eventId === event.id;
      const generalSingleEventItem =
        !hasMultipleEvents && !item.eventId && allocations.length === 0;

      return assignedByAllocation || assignedByLegacyEventId || generalSingleEventItem;
    })
    .map((item) => item.name)
    .filter(Boolean);

  return Array.from(new Set(names));
};

const makeEventId = () =>
  crypto.randomUUID?.() || `event-${Date.now()}-${Math.random()}`;

const dateKey = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const coerceEventDate = (value) => {
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
    const [, y, m, d] = isoMatch;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const coerceTimestampDate = (value) => {
  if (!value) return null;
  if (typeof value?.toDate === "function") {
    const date = value.toDate();
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const startOfMonth = (date) =>
  new Date(date.getFullYear(), date.getMonth(), 1);

const sameMonth = (a, b) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();

const statusClass = (status = "Processing") =>
  `status-${String(status || "Processing")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")}`;

const formatTimeRange = (event) => {
  const start = event.startTime ? to12h(event.startTime) : "";
  const end = event.endTime ? to12h(event.endTime) : "";
  if (start && end) return `${start} - ${end}`;
  return start || end || "Time TBD";
};

const monthLabel = (date) =>
  date.toLocaleDateString(undefined, { month: "long", year: "numeric" });

const eventSort = (a, b) => {
  if (a.dateKey !== b.dateKey) return a.dateKey.localeCompare(b.dateKey);
  const timeCompare = String(a.startTime || "").localeCompare(
    String(b.startTime || "")
  );
  if (timeCompare !== 0) return timeCompare;
  return String(a.clientName || "").localeCompare(String(b.clientName || ""));
};

const eventDetailsPath = (event) =>
  `/dashboard-admin/events/${event.inquiryId}/${event.id}`;

const fileSlug = (value = "event") => {
  const slug = String(value || "event")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "event";
};

const singleEventFileName = (event) =>
  `or-music-${event.dateKey || "event"}-${fileSlug(event.clientName)}.ics`;

const formatSubscriptionDate = (value, fallback = "Not yet") => {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const shortenUserAgent = (value = "") => {
  const text = String(value || "").trim();
  if (!text) return "No fetch yet";
  if (text.length <= 92) return text;
  return `${text.slice(0, 89)}...`;
};

const emptyInquiryDraft = {
  name: "",
  email: "",
  phoneNumber: "",
  eventDetails: "",
  status: "Processing",
  eventType: "",
  venue: "",
  date: "",
  startTime: "",
  endTime: "",
};

export default function AdminDashboard() {
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [showCreateInquiry, setShowCreateInquiry] = useState(false);
  const [creatingInquiry, setCreatingInquiry] = useState(false);
  const [newInquiryDraft, setNewInquiryDraft] = useState(emptyInquiryDraft);
  const [statusFilter, setStatusFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(() =>
    startOfMonth(new Date())
  );
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [subscriptionMessage, setSubscriptionMessage] = useState("");
  const [calendarUsers, setCalendarUsers] = useState([]);
  const [calendarSubscriptions, setCalendarSubscriptions] = useState([]);
  const [subscriptionsLoading, setSubscriptionsLoading] = useState(false);
  const [creatingSubscription, setCreatingSubscription] = useState(false);
  const [deletingSubscriptionId, setDeletingSubscriptionId] = useState("");
  const [subscriptionDraft, setSubscriptionDraft] = useState({
    label: "",
    assignedUserId: "",
  });
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [subscriptionUrls, setSubscriptionUrls] = useState({
    feedUrl: "",
    webcalUrl: "",
  });

  const todayKey = useMemo(() => dateKey(new Date()), []);
  const todayStart = useMemo(() => coerceEventDate(todayKey), [todayKey]);

  useEffect(() => {
    const ref = collection(db, "inquiries");
    const q = query(ref, orderBy("timestamp", "desc"));
    const stop = onSnapshot(
      q,
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
        console.error("Dashboard inquiries error:", error);
        setLoadError("Could not load events. Check the console for details.");
        setLoading(false);
      }
    );
    return () => stop();
  }, []);

  useEffect(() => {
    const usersQuery = query(collection(db, "users"), orderBy("name", "asc"));
    const stop = onSnapshot(
      usersQuery,
      (snap) =>
        setCalendarUsers(
          snap.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          }))
        ),
      (error) => console.error("Calendar users load failed:", error)
    );
    return () => stop();
  }, []);

  const allEvents = useMemo(() => {
    const events = inquiries.flatMap((inquiry) => {
      const status = inquiry.status || "Processing";
      const createdAt = coerceTimestampDate(inquiry.timestamp);
      const inquiryEvents = normalizeEvents(inquiry.events);
      return inquiryEvents
        .map((event) => {
          const eventDate = coerceEventDate(event.date);
          if (!eventDate) return null;
          const eventDateKey = dateKey(eventDate);
          return {
            ...event,
            date: event.date || eventDateKey,
            dateKey: eventDateKey,
            eventDate,
            inquiryId: inquiry.id,
            clientName: inquiry.name || inquiry.userName || "Unknown client",
            email: inquiry.email || inquiry.userEmail || "",
            phoneNumber: inquiry.phoneNumber || "",
            eventDetails: inquiry.eventDetails || "",
            serviceNames: serviceNamesForEvent(inquiry, event, inquiryEvents),
            createdAt,
            status,
          };
        })
        .filter(Boolean);
    });

    return events.sort(eventSort);
  }, [inquiries]);

  const statusCounts = useMemo(() => {
    const counts = { All: allEvents.length };
    STATUS_OPTIONS.forEach((status) => {
      counts[status] = 0;
    });
    allEvents.forEach((event) => {
      counts[event.status] = (counts[event.status] || 0) + 1;
    });
    return counts;
  }, [allEvents]);

  const filteredEvents = useMemo(() => {
    const term = search.trim().toLowerCase();
    return allEvents.filter((event) => {
      if (statusFilter !== "All" && event.status !== statusFilter) {
        return false;
      }
      if (!term) return true;
      const haystack = [
        event.clientName,
        event.email,
        event.phoneNumber,
        event.type,
        event.venue,
        event.status,
        event.eventDetails,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [allEvents, search, statusFilter]);

  const filteredStatusCounts = useMemo(() => {
    const counts = { All: filteredEvents.length };
    STATUS_OPTIONS.forEach((status) => {
      counts[status] = filteredEvents.filter(
        (event) => event.status === status
      ).length;
    });
    return counts;
  }, [filteredEvents]);

  const calendarDays = useMemo(() => {
    const first = startOfMonth(calendarMonth);
    const gridStart = new Date(first);
    gridStart.setDate(first.getDate() - first.getDay());

    return Array.from({ length: 42 }, (_, index) => {
      const day = new Date(gridStart);
      day.setDate(gridStart.getDate() + index);
      const key = dateKey(day);
      return {
        date: day,
        key,
        inMonth: sameMonth(day, calendarMonth),
        isToday: key === todayKey,
      };
    });
  }, [calendarMonth, todayKey]);

  const eventsByDay = useMemo(() => {
    const map = new Map();
    filteredEvents.forEach((event) => {
      const list = map.get(event.dateKey) || [];
      list.push(event);
      map.set(event.dateKey, list.sort(eventSort));
    });
    return map;
  }, [filteredEvents]);

  const mobileCalendarDays = useMemo(
    () => {
      const isCurrentMonth = sameMonth(calendarMonth, todayStart);
      return calendarDays
        .filter((day) => day.inMonth)
        .filter((day) => !isCurrentMonth || day.date >= todayStart)
        .map((day) => ({
          ...day,
          events: (eventsByDay.get(day.key) || []).filter(
            (event) => !isCurrentMonth || event.eventDate >= todayStart
          ),
        }))
        .filter((day) => day.events.length > 0 || day.isToday);
    },
    [calendarDays, calendarMonth, eventsByDay, todayStart]
  );

  const calendarMonthEvents = useMemo(
    () =>
      filteredEvents.filter((event) =>
        sameMonth(event.eventDate, calendarMonth)
      ),
    [calendarMonth, filteredEvents]
  );
  const monthEventCount = calendarMonthEvents.length;

  const sidebarEvents = useMemo(() => {
    const upcoming = filteredEvents
      .filter((event) => event.eventDate >= todayStart)
      .sort(eventSort);
    const previous = filteredEvents
      .filter((event) => event.eventDate < todayStart)
      .sort((a, b) => eventSort(b, a));
    return [...upcoming, ...previous].slice(0, 18);
  }, [filteredEvents, todayStart]);

  const pastCount = allEvents.filter(
    (event) => event.eventDate < todayStart
  ).length;
  const confirmedCount = statusCounts.Confirmed || 0;
  const processingPendingEvents = useMemo(
    () =>
      allEvents
        .filter((event) => ["Processing", "Pending"].includes(event.status))
        .sort((a, b) => {
          const aCreated = a.createdAt ? a.createdAt.getTime() : 0;
          const bCreated = b.createdAt ? b.createdAt.getTime() : 0;
          if (aCreated !== bCreated) return aCreated - bCreated;
          return eventSort(a, b);
        })
        .slice(0, 10),
    [allEvents]
  );

  const pendingDays = (createdAt) => {
    if (!createdAt) return null;
    const createdDay = new Date(
      createdAt.getFullYear(),
      createdAt.getMonth(),
      createdAt.getDate()
    );
    const diffMs = todayStart.getTime() - createdDay.getTime();
    return Math.max(0, Math.floor(diffMs / 86400000));
  };

  const moveMonth = (offset) => {
    setCalendarMonth(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + offset, 1)
    );
  };

  const showToday = () => {
    setCalendarMonth(startOfMonth(new Date()));
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("All");
  };

  const exportEventsToAppleCalendar = (events, fileName) => {
    const eventList = (Array.isArray(events) ? events : [events]).filter(Boolean);
    if (eventList.length === 0) return;

    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const calendarText = buildIcsCalendar(eventList, {
      calendarName: "OR Music Events",
      getSourceUrl: (event) =>
        origin ? `${origin}${eventDetailsPath(event)}` : eventDetailsPath(event),
    });
    downloadIcsFile(calendarText, fileName);
  };

  const copySubscriptionUrl = async (url = subscriptionUrls.feedUrl) => {
    if (!url) return false;
    try {
      await navigator.clipboard?.writeText(url);
      setSubscriptionMessage("Subscription link copied.");
      return true;
    } catch {
      setSubscriptionMessage("Copy the subscription link from the dialog.");
      return false;
    }
  };

  const loadCalendarSubscriptions = async () => {
    try {
      setSubscriptionsLoading(true);
      const listSubscriptions = httpsCallable(
        firebaseFunctions,
        "adminCalendarSubscriptions"
      );
      const result = await listSubscriptions();
      setCalendarSubscriptions(result.data?.subscriptions || []);
    } catch (error) {
      console.error("Calendar subscriptions load failed:", error);
      setSubscriptionMessage("Could not load calendar subscriptions.");
    } finally {
      setSubscriptionsLoading(false);
    }
  };

  const createCalendarSubscription = async () => {
    try {
      setCreatingSubscription(true);
      setSubscriptionMessage("");
      const assignedUser = calendarUsers.find(
        (user) => user.id === subscriptionDraft.assignedUserId
      );

      const createSubscription = httpsCallable(
        firebaseFunctions,
        "adminCalendarCreateSubscription"
      );
      const result = await createSubscription({
        label: subscriptionDraft.label,
        assignedUserId: subscriptionDraft.assignedUserId,
        assignedUserName: assignedUser?.name || "",
        assignedUserEmail: assignedUser?.email || "",
      });
      const feedUrl = result.data?.feedUrl;
      const webcalUrl =
        result.data?.webcalUrl || feedUrl?.replace(/^https:/i, "webcal:");
      const subscription = result.data?.subscription;

      if (!feedUrl || !webcalUrl) {
        throw new Error("The calendar feed URL was not returned.");
      }

      setSubscriptionUrls({ feedUrl, webcalUrl });
      if (subscription) {
        setCalendarSubscriptions((current) => [
          subscription,
          ...current.filter((row) => row.id !== subscription.id),
        ]);
      }
      setSubscriptionDraft({ label: "", assignedUserId: "" });
      await copySubscriptionUrl(feedUrl);
    } catch (error) {
      console.error("Calendar subscription create failed:", error);
      setSubscriptionMessage("Could not create subscription link.");
      alert("Could not create the calendar subscription. Check the console for details.");
    } finally {
      setCreatingSubscription(false);
    }
  };

  const deleteCalendarSubscription = async (subscriptionId) => {
    if (!subscriptionId) return;
    if (
      typeof window !== "undefined" &&
      !window.confirm("Delete this calendar subscription? This cannot be undone.")
    ) {
      return;
    }

    try {
      setDeletingSubscriptionId(subscriptionId);
      const deleteSubscription = httpsCallable(
        firebaseFunctions,
        "adminCalendarDeleteSubscription"
      );
      await deleteSubscription({ subscriptionId });
      setCalendarSubscriptions((current) =>
        current.filter((subscription) => subscription.id !== subscriptionId)
      );
      setSubscriptionMessage("Subscription deleted.");
    } catch (error) {
      console.error("Calendar subscription delete failed:", error);
      setSubscriptionMessage("Could not delete subscription.");
      alert("Could not delete the calendar subscription. Check the console for details.");
    } finally {
      setDeletingSubscriptionId("");
    }
  };

  const openAppleCalendarSubscription = async () => {
    try {
      setSubscriptionLoading(true);
      setSubscriptionMessage("");
      setShowSubscriptionModal(true);
      await loadCalendarSubscriptions();
    } catch (error) {
      console.error("Calendar subscription failed:", error);
      setSubscriptionMessage("Could not open calendar subscriptions.");
      alert("Could not open calendar subscriptions. Check the console for details.");
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const openCreateInquiry = () => {
    setNewInquiryDraft(emptyInquiryDraft);
    setShowCreateInquiry(true);
  };

  const createInquiry = async () => {
    const draft = newInquiryDraft;
    const hasEvent =
      draft.eventType ||
      draft.venue ||
      draft.date ||
      draft.startTime ||
      draft.endTime;
    const events = hasEvent
      ? [
          {
            id: makeEventId(),
            type: draft.eventType || "Event",
            venue: draft.venue || "",
            date: draft.date || "",
            startTime: draft.startTime || "",
            endTime: draft.endTime || "",
          },
        ]
      : [];

    try {
      setCreatingInquiry(true);
      await addDoc(collection(db, "inquiries"), {
        name: draft.name.trim(),
        email: draft.email.trim(),
        phoneNumber: draft.phoneNumber.trim(),
        eventDetails: draft.eventDetails.trim(),
        status: draft.status || "Processing",
        timestamp: serverTimestamp(),
        items: [],
        deposits: [],
        contracts: [],
        events,
        source: "manual",
      });
      setShowCreateInquiry(false);
      setNewInquiryDraft(emptyInquiryDraft);
    } catch (error) {
      console.error("Create inquiry failed:", error);
      alert("Failed to create inquiry. Check the console for details.");
    } finally {
      setCreatingInquiry(false);
    }
  };

  return (
    <Container fluid="xl" className="admin-dashboard py-3">
      <div className="admin-dashboard-header">
        <div>
          <div className="admin-dashboard-kicker">
            <CalendarCheck size={16} />
            Admin schedule
          </div>
          <h1>Event dashboard</h1>
          <p>
            Scheduled events grouped by inquiry status, including previous,
            completed, current, and upcoming dates.
          </p>
          <div className="admin-dashboard-header-actions">
            <Button onClick={openCreateInquiry}>
              <Plus size={17} />
              Create inquiry
            </Button>
            <Button
              type="button"
              variant="outline-primary"
              onClick={openAppleCalendarSubscription}
              disabled={subscriptionLoading}
            >
              <CalendarPlus size={17} />
              {subscriptionLoading ? "Loading..." : "Calendar subscriptions"}
            </Button>
            {subscriptionMessage ? (
              <span className="admin-calendar-subscription-status">
                {subscriptionMessage}
              </span>
            ) : null}
          </div>
        </div>

        <div
          className="admin-dashboard-summary"
          aria-label="Event summary"
        >
          <div>
            <span>Events</span>
            <strong>{statusCounts.All || 0}</strong>
          </div>
          <div>
            <span>Previous</span>
            <strong>{pastCount}</strong>
          </div>
          <div>
            <span>Confirmed</span>
            <strong>{confirmedCount}</strong>
          </div>
        </div>
      </div>

      <div className="admin-dashboard-toolbar">
        <InputGroup className="admin-dashboard-search">
          <InputGroup.Text>
            <Search size={16} />
          </InputGroup.Text>
          <Form.Control
            type="search"
            placeholder="Search client, venue, type, email, phone, or status"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </InputGroup>

        <div className="admin-dashboard-status-filters">
          {["All", ...STATUS_OPTIONS].map((status) => (
            <Button
              key={status}
              size="sm"
              variant={statusFilter === status ? "primary" : "outline-primary"}
              onClick={() => setStatusFilter(status)}
            >
              {status}
              <Badge
                bg={statusFilter === status ? "light" : "secondary"}
                text={statusFilter === status ? "dark" : undefined}
                className="ms-2"
              >
                {statusCounts[status] || 0}
              </Badge>
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="d-flex align-items-center justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      ) : loadError ? (
        <div className="admin-dashboard-empty">{loadError}</div>
      ) : (
        <Row className="g-3 align-items-start">
          <Col xl={8}>
            <section className="admin-dashboard-panel admin-attention-panel">
              <div className="admin-calendar-toolbar">
                <div>
                  <div className="admin-calendar-label">
                    <Clock size={18} />
                    Processing and pending
                  </div>
                  <div className="text-muted small">
                    Events waiting for admin action, oldest inquiry first
                  </div>
                </div>
                <Badge bg="warning" text="dark">
                  {processingPendingEvents.length}
                </Badge>
              </div>

              {processingPendingEvents.length === 0 ? (
                <div className="admin-dashboard-empty compact">
                  No processing or pending events.
                </div>
              ) : (
                <div className="admin-pending-event-grid">
                  {processingPendingEvents.map((event) => {
                    const days = pendingDays(event.createdAt);
                    return (
                      <Link
                        key={`${event.inquiryId}-${event.id}`}
                        to={eventDetailsPath(event)}
                        className={`admin-pending-event-card ${statusClass(
                          event.status
                        )}`}
                      >
                        <div>
                          <span className="admin-pending-event-date">
                            {prettyDate(event.dateKey)}
                          </span>
                          <strong>{event.clientName}</strong>
                          <span>{event.type || "Event"}</span>
                        </div>
                        <div className="admin-pending-event-badges">
                          <span
                            className={`admin-status-badge ${statusClass(
                              event.status
                            )}`}
                          >
                            {event.status}
                          </span>
                          <Badge bg="warning" text="dark">
                            {days == null
                              ? "pending"
                              : `${days} day${days === 1 ? "" : "s"} pending`}
                          </Badge>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="admin-dashboard-panel">
              <div className="admin-calendar-toolbar">
                <div>
                  <div className="admin-calendar-label">
                    <CalendarDays size={18} />
                    {monthLabel(calendarMonth)}
                  </div>
                  <div className="text-muted small">
                    {monthEventCount} filtered event
                    {monthEventCount === 1 ? "" : "s"} this month
                  </div>
                </div>
                <div className="admin-calendar-actions">
                  <Button
                    type="button"
                    variant="outline-primary"
                    size="sm"
                    onClick={() => moveMonth(-1)}
                    aria-label="Previous month"
                  >
                    <ChevronLeft size={17} />
                  </Button>
                  <Button
                    type="button"
                    variant="outline-primary"
                    size="sm"
                    onClick={showToday}
                  >
                    Today
                  </Button>
                  <Button
                    type="button"
                    variant="outline-primary"
                    size="sm"
                    onClick={() => moveMonth(1)}
                    aria-label="Next month"
                  >
                    <ChevronRight size={17} />
                  </Button>
                  <Button
                    type="button"
                    variant="outline-secondary"
                    size="sm"
                    className="admin-calendar-export"
                    onClick={() =>
                      exportEventsToAppleCalendar(
                        calendarMonthEvents,
                        `or-music-events-${dateKey(calendarMonth).slice(0, 7)}.ics`
                      )
                    }
                    disabled={calendarMonthEvents.length === 0}
                    title="Download an Apple Calendar .ics file for this filtered month"
                  >
                    <Download size={16} />
                    Apple Calendar
                  </Button>
                </div>
              </div>

              <div className="admin-calendar-legend" aria-label="Status legend">
                {STATUS_OPTIONS.map((status) => (
                  <span key={status} className={statusClass(status)}>
                    <span aria-hidden="true" />
                    {status}
                  </span>
                ))}
              </div>

              <div className="admin-calendar-scroll">
                <div className="admin-calendar-weekdays">
                  {WEEKDAYS.map((day) => (
                    <div key={day}>{day}</div>
                  ))}
                </div>
                <div className="admin-calendar-grid">
                  {calendarDays.map((day) => {
                    const dayEvents = eventsByDay.get(day.key) || [];
                    const visibleEvents = dayEvents.slice(0, 3);
                    const hiddenCount = Math.max(0, dayEvents.length - 3);

                    return (
                      <div
                        key={day.key}
                        className={[
                          "admin-calendar-cell",
                          day.inMonth ? "" : "is-outside",
                          day.isToday ? "is-today" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <div className="admin-calendar-day-number">
                          {day.date.getDate()}
                        </div>
                        <div className="admin-calendar-events">
                          {visibleEvents.map((event) => (
                            <Link
                              key={`${event.inquiryId}-${event.id}`}
                              to={eventDetailsPath(event)}
                              className={`admin-event-pill ${statusClass(
                                event.status
                              )}`}
                              title={`${event.clientName} - ${
                                event.type || "Event"
                              } - ${event.status}`}
                            >
                              <span className="admin-event-pill-title">
                                {event.clientName}
                              </span>
                              <span className="admin-event-pill-meta">
                                {event.type || "Event"} -{" "}
                                {formatTimeRange(event)}
                              </span>
                            </Link>
                          ))}
                          {hiddenCount > 0 ? (
                            <div className="admin-calendar-more">
                              +{hiddenCount} more
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div
                className="admin-calendar-mobile-list"
                aria-label="Mobile month agenda"
              >
                {mobileCalendarDays.length === 0 ? (
                  <div className="admin-dashboard-empty compact">
                    {sameMonth(calendarMonth, todayStart)
                      ? "No events match the current filters from today forward."
                      : "No events match the current filters this month."}
                  </div>
                ) : (
                  mobileCalendarDays.map((day) => (
                    <div
                      key={`mobile-${day.key}`}
                      className={`admin-mobile-day-card ${
                        day.isToday ? "is-today" : ""
                      }`}
                    >
                      <div className="admin-mobile-day-header">
                        <div>
                          <span>
                            {day.date.toLocaleDateString(undefined, {
                              weekday: "long",
                            })}
                          </span>
                          <strong>
                            {day.date.toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                            })}
                          </strong>
                        </div>
                        {day.isToday ? (
                          <Badge bg="primary">Today</Badge>
                        ) : null}
                      </div>

                      {day.events.length === 0 ? (
                        <div className="admin-mobile-empty-day">
                          No filtered events today.
                        </div>
                      ) : (
                        <div className="admin-mobile-event-list">
                          {day.events.map((event) => (
                            <article
                              key={`${event.inquiryId}-${event.id}`}
                              className={`admin-mobile-event ${statusClass(
                                event.status
                              )}`}
                            >
                              <Link
                                to={eventDetailsPath(event)}
                                className="admin-mobile-event-link"
                              >
                                <div>
                                  <strong>{event.clientName}</strong>
                                  <span>{event.type || "Event"}</span>
                                  {event.serviceNames?.length ? (
                                    <span className="admin-mobile-event-services">
                                      {event.serviceNames.join(", ")}
                                    </span>
                                  ) : null}
                                </div>
                                <div>
                                  <span>{formatTimeRange(event)}</span>
                                  <span>{event.status}</span>
                                </div>
                              </Link>
                              <Button
                                type="button"
                                variant="outline-secondary"
                                size="sm"
                                className="admin-mobile-calendar-button"
                                onClick={() =>
                                  exportEventsToAppleCalendar(
                                    event,
                                    singleEventFileName(event)
                                  )
                                }
                                title="Download an Apple Calendar .ics file for this event"
                              >
                                <CalendarPlus size={15} />
                                Apple Calendar
                              </Button>
                            </article>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </section>
          </Col>

          <Col xl={4} className="admin-events-column">
            <section className="admin-dashboard-panel admin-upcoming-panel">
              <div className="admin-upcoming-heading">
                <div>
                  <div className="admin-calendar-label">
                    <ListFilter size={18} />
                    Events
                  </div>
                  <div className="text-muted small">
                    Showing {sidebarEvents.length} of {filteredEvents.length},
                    upcoming first
                  </div>
                </div>
                {(search || statusFilter !== "All") && (
                  <Button
                    type="button"
                    variant="outline-secondary"
                    size="sm"
                    onClick={clearFilters}
                  >
                    Clear
                  </Button>
                )}
              </div>

              <div className="admin-status-breakdown">
                {STATUS_OPTIONS.filter(
                  (status) => filteredStatusCounts[status] > 0
                ).map((status) => (
                    <span key={status} className={statusClass(status)}>
                      <span aria-hidden="true" />
                      {status}: {filteredStatusCounts[status]}
                    </span>
                  ))}
              </div>

              {sidebarEvents.length === 0 ? (
                <div className="admin-dashboard-empty">
                  No events match the current filters.
                </div>
              ) : (
                <div className="admin-upcoming-list">
                  {sidebarEvents.map((event) => (
                    <article
                      key={`${event.inquiryId}-${event.id}`}
                      className={`admin-upcoming-card ${statusClass(event.status)}`}
                    >
                      <div className="admin-upcoming-card-top">
                        <div className="admin-upcoming-main">
                          <div className="admin-upcoming-date">
                            {prettyDate(event.dateKey)}
                          </div>
                          <Link
                            to={eventDetailsPath(event)}
                            className="admin-upcoming-title-link"
                          >
                            <h2>
                              {event.clientName}{" "}
                              <span>{event.type || "Event"}</span>
                            </h2>
                          </Link>
                        </div>
                        <span
                          className={`admin-status-badge ${statusClass(
                            event.status
                          )}`}
                        >
                          {event.status}
                        </span>
                      </div>

                      <div className="admin-upcoming-meta">
                        <span>
                          <Clock size={15} />
                          {formatTimeRange(event)}
                        </span>
                        {event.venue ? (
                          <span>
                            <MapPin size={15} />
                            {event.venue}
                          </span>
                        ) : null}
                        <span>
                          <UsersRound size={15} />
                          {event.email ||
                            event.phoneNumber ||
                            "No contact listed"}
                        </span>
                      </div>

                      <div className="admin-upcoming-actions">
                        <Link to={eventDetailsPath(event)}>View event</Link>
                        <Link to="/inquiries-admin">Open inquiry</Link>
                        <Button
                          type="button"
                          variant="link"
                          className="admin-calendar-link-button"
                          onClick={() =>
                            exportEventsToAppleCalendar(
                              event,
                              singleEventFileName(event)
                            )
                          }
                          title="Download an Apple Calendar .ics file for this event"
                        >
                          <CalendarPlus size={14} />
                          Apple Calendar
                        </Button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </Col>
        </Row>
      )}

      <Modal
        show={showCreateInquiry}
        onHide={() => setShowCreateInquiry(false)}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Create inquiry</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row className="g-3">
            <Col md={6}>
              <Form.Label>Name</Form.Label>
              <Form.Control
                value={newInquiryDraft.name}
                onChange={(event) =>
                  setNewInquiryDraft((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                disabled={creatingInquiry}
              />
            </Col>
            <Col md={6}>
              <Form.Label>Status</Form.Label>
              <Form.Select
                value={newInquiryDraft.status}
                onChange={(event) =>
                  setNewInquiryDraft((current) => ({
                    ...current,
                    status: event.target.value,
                  }))
                }
                disabled={creatingInquiry}
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col md={6}>
              <Form.Label>Email</Form.Label>
              <Form.Control
                value={newInquiryDraft.email}
                onChange={(event) =>
                  setNewInquiryDraft((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                disabled={creatingInquiry}
              />
            </Col>
            <Col md={6}>
              <Form.Label>Phone</Form.Label>
              <Form.Control
                value={newInquiryDraft.phoneNumber}
                onChange={(event) =>
                  setNewInquiryDraft((current) => ({
                    ...current,
                    phoneNumber: event.target.value,
                  }))
                }
                disabled={creatingInquiry}
              />
            </Col>
            <Col xs={12}>
              <Form.Label>Inquiry notes</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={newInquiryDraft.eventDetails}
                onChange={(event) =>
                  setNewInquiryDraft((current) => ({
                    ...current,
                    eventDetails: event.target.value,
                  }))
                }
                disabled={creatingInquiry}
              />
            </Col>
          </Row>

          <div className="admin-create-event-box">
            <div>
              <strong>First event date</strong>
              <span>Add this now so the inquiry appears on the calendar.</span>
            </div>
            <Row className="g-2 mt-1">
              <Col md={4}>
                <Form.Label>Type</Form.Label>
                <Form.Control
                  value={newInquiryDraft.eventType}
                  onChange={(event) =>
                    setNewInquiryDraft((current) => ({
                      ...current,
                      eventType: event.target.value,
                    }))
                  }
                  disabled={creatingInquiry}
                />
              </Col>
              <Col md={4}>
                <Form.Label>Venue</Form.Label>
                <Form.Control
                  value={newInquiryDraft.venue}
                  onChange={(event) =>
                    setNewInquiryDraft((current) => ({
                      ...current,
                      venue: event.target.value,
                    }))
                  }
                  disabled={creatingInquiry}
                />
              </Col>
              <Col md={4}>
                <Form.Label>Date</Form.Label>
                <Form.Control
                  type="date"
                  value={newInquiryDraft.date}
                  onChange={(event) =>
                    setNewInquiryDraft((current) => ({
                      ...current,
                      date: event.target.value,
                    }))
                  }
                  disabled={creatingInquiry}
                />
              </Col>
              <Col md={6}>
                <Form.Label>Start</Form.Label>
                <Form.Control
                  type="time"
                  value={newInquiryDraft.startTime}
                  onChange={(event) =>
                    setNewInquiryDraft((current) => ({
                      ...current,
                      startTime: event.target.value,
                    }))
                  }
                  disabled={creatingInquiry}
                />
              </Col>
              <Col md={6}>
                <Form.Label>End</Form.Label>
                <Form.Control
                  type="time"
                  value={newInquiryDraft.endTime}
                  onChange={(event) =>
                    setNewInquiryDraft((current) => ({
                      ...current,
                      endTime: event.target.value,
                    }))
                  }
                  disabled={creatingInquiry}
                />
              </Col>
            </Row>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="outline-secondary"
            onClick={() => setShowCreateInquiry(false)}
            disabled={creatingInquiry}
          >
            Cancel
          </Button>
          <Button onClick={createInquiry} disabled={creatingInquiry}>
            {creatingInquiry ? "Creating" : "Create inquiry"}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal
        show={showSubscriptionModal}
        onHide={() => setShowSubscriptionModal(false)}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>OR Music Events calendar</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="admin-calendar-subscription-heading">
            <div>
              <strong>Subscription links</strong>
              <span>{calendarSubscriptions.length} recorded</span>
            </div>
          </div>

          <div className="admin-subscription-create">
            <Form.Group controlId="calendarSubscriptionName">
              <Form.Label>Subscription name</Form.Label>
              <Form.Control
                value={subscriptionDraft.label}
                placeholder="Omer iPhone"
                onChange={(event) =>
                  setSubscriptionDraft((current) => ({
                    ...current,
                    label: event.target.value,
                  }))
                }
              />
            </Form.Group>
            <Form.Group controlId="calendarSubscriptionUser">
              <Form.Label>Assigned user</Form.Label>
              <Form.Select
                value={subscriptionDraft.assignedUserId}
                onChange={(event) =>
                  setSubscriptionDraft((current) => ({
                    ...current,
                    assignedUserId: event.target.value,
                  }))
                }
              >
                <option value="">Unassigned</option>
                {calendarUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name || user.email || user.id}
                    {user.name && user.email ? ` (${user.email})` : ""}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            <Button
              type="button"
              onClick={createCalendarSubscription}
              disabled={creatingSubscription}
            >
              <CalendarPlus size={16} />
              {creatingSubscription ? "Creating..." : "Create link"}
            </Button>
          </div>

          {subscriptionUrls.feedUrl ? (
            <>
              <Form.Label>Latest subscription URL</Form.Label>
              <InputGroup className="admin-calendar-subscription-url">
                <Form.Control
                  value={subscriptionUrls.feedUrl}
                  readOnly
                  onFocus={(event) => event.target.select()}
                />
                <Button
                  type="button"
                  variant="outline-primary"
                  onClick={() => copySubscriptionUrl()}
                >
                  Copy
                </Button>
                {subscriptionUrls.webcalUrl ? (
                  <Button
                    type="button"
                    variant="outline-primary"
                    onClick={() => {
                      window.location.href = subscriptionUrls.webcalUrl;
                    }}
                  >
                    Open
                  </Button>
                ) : null}
              </InputGroup>
            </>
          ) : null}

          <div className="admin-calendar-subscription-note">
            Apple Calendar fetches show here after the device refreshes the
            subscribed calendar.
          </div>

          {subscriptionsLoading ? (
            <div className="admin-subscription-empty">
              <Spinner animation="border" size="sm" />
              Loading subscriptions
            </div>
          ) : calendarSubscriptions.length === 0 ? (
            <div className="admin-subscription-empty">
              No calendar subscriptions yet.
            </div>
          ) : (
            <div className="admin-subscription-list">
              {calendarSubscriptions.map((subscription) => (
                <article
                  key={subscription.id}
                  className={`admin-subscription-row ${
                    subscription.active ? "" : "is-revoked"
                  }`}
                >
                  <div className="admin-subscription-main">
                    <div>
                      <strong>{subscription.label || "Calendar link"}</strong>
                      <span>
                        Assigned to{" "}
                        {subscription.assignedUserName ||
                          subscription.assignedUserEmail ||
                          "Unassigned"}
                      </span>
                    </div>
                    <span
                      className={`admin-status-badge ${
                        subscription.active ? "status-confirmed" : "status-cancelled"
                      }`}
                    >
                      {subscription.active ? "Active" : "Revoked"}
                    </span>
                  </div>
                  <div className="admin-subscription-meta">
                    <span>
                      Created by{" "}
                      {subscription.createdByName ||
                        subscription.createdByEmail ||
                        "Unknown admin"}
                    </span>
                    <span>
                      Created {formatSubscriptionDate(subscription.createdAt)}
                    </span>
                    <span>
                      Last sync{" "}
                      {formatSubscriptionDate(subscription.lastFetchedAt)}
                    </span>
                    <span>{shortenUserAgent(subscription.lastUserAgent)}</span>
                  </div>
                  <div className="admin-subscription-actions">
                    <Button
                      type="button"
                      variant="outline-danger"
                      size="sm"
                      onClick={() => deleteCalendarSubscription(subscription.id)}
                      disabled={deletingSubscriptionId === subscription.id}
                    >
                      <Trash2 size={14} />
                      {deletingSubscriptionId === subscription.id
                        ? "Deleting..."
                        : "Delete"}
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            type="button"
            variant="outline-secondary"
            onClick={() => setShowSubscriptionModal(false)}
          >
            Done
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
