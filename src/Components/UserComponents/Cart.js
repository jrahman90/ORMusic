// Cart.js
import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Alert,
  Button,
  Card,
  Container,
  Form,
  Row,
  Col,
  Badge,
  ListGroup,
  Modal,
} from "react-bootstrap";
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import db from "../../api/firestore/firestore";
import { to12h, prettyDate } from "../../utils/formatters";
import emailjs from "@emailjs/browser";

/* ---------- Helpers ---------- */
const money = (v) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    Number(v || 0)
  );

const emailOk = (v) => /\S+@\S+\.\S+/.test(String(v || "").trim());
const minLen = (v, n) => String(v || "").trim().length >= n;
const makeEventId = () =>
  crypto.randomUUID?.() || `event-${Date.now()}-${Math.random()}`;

// shallowish deep equal for small arrays of plain objects
function equalItems(a, b) {
  try {
    return JSON.stringify(a || []) === JSON.stringify(b || []);
  } catch {
    return false;
  }
}

const formatItemsForEmail = (items = []) => {
  return (items || [])
    .map((it) => {
      const qty = Number(it.quantity || 0);
      const price = Number(it.price || 0);
      const line = qty * price;
      return `${it.name} (x${qty}) @ ${money(price)} = ${money(line)}`;
    })
    .join("\n");
};

const eventLabel = (ev, fallback = "Event") => {
  if (!ev) return fallback;
  const date = ev.date ? prettyDate(ev.date) : "Date TBD";
  const time =
    ev.startTime || ev.endTime
      ? `, ${ev.startTime ? to12h(ev.startTime) : "Start TBD"} - ${
          ev.endTime ? to12h(ev.endTime) : "End TBD"
        }`
      : "";
  const venue = ev.venue ? ` at ${ev.venue}` : "";
  return `${ev.type || fallback} on ${date}${time}${venue}`;
};

const normalizeAllocations = (item = {}, events = []) => {
  const eventIds = new Set(events.map((ev) => ev.id));
  const totalQty = Math.max(0, Number(item.quantity || 0));
  const raw = Array.isArray(item.eventAllocations)
    ? item.eventAllocations
    : [];
  const allocations = raw
    .map((row) => ({
      eventId: row?.eventId || "",
      quantity: Math.max(0, Number(row?.quantity || 0)),
    }))
    .filter((row) => row.quantity > 0 && eventIds.has(row.eventId));

  if (allocations.length === 0 && item.eventId && eventIds.has(item.eventId)) {
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

const allocationSummary = (item = {}, events = []) => {
  const eventMap = new Map(events.map((ev) => [ev.id, ev]));
  const allocations = normalizeAllocations(item, events);
  const assigned = allocations.reduce((sum, row) => sum + row.quantity, 0);
  const totalQty = Math.max(0, Number(item.quantity || 0));
  const lines = allocations.map(
    (row) => `${row.quantity} to ${eventLabel(eventMap.get(row.eventId))}`
  );
  const remaining = totalQty - assigned;
  if (remaining > 0) lines.push(`${remaining} unassigned/general`);
  return lines.length ? lines.join("; ") : "Not assigned to a specific event";
};

const splitItemsByEvent = (items = [], events = []) => {
  const grouped = new Map(events.map((ev) => [ev.id, []]));
  const unassigned = [];

  (items || []).forEach((item) => {
    const totalQty = Math.max(0, Number(item.quantity || 0));
    const allocations = normalizeAllocations(item, events);
    const assigned = allocations.reduce((sum, row) => sum + row.quantity, 0);
    allocations.forEach((row) => {
      grouped.get(row.eventId)?.push({ ...item, quantity: row.quantity });
    });
    const remaining = Math.max(0, totalQty - assigned);
    if (remaining > 0) unassigned.push({ ...item, quantity: remaining });
  });

  return { grouped, unassigned };
};

function EventPickerModal({ show, title, events, selectedEventId, onPick, onHide }) {
  return (
    <Modal show={show} onHide={onHide} centered dialogClassName="event-picker-modal">
      <Modal.Header closeButton>
        <Modal.Title>{title || "Choose event"}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="event-picker-list">
          <button
            type="button"
            className={`event-picker-option ${
              !selectedEventId ? "is-selected" : ""
            }`}
            onClick={() => onPick("")}
          >
            <span>Not sure yet / applies generally</span>
          </button>
          {events.map((ev) => (
            <button
              type="button"
              key={ev.id}
              className={`event-picker-option ${
                selectedEventId === ev.id ? "is-selected" : ""
              }`}
              onClick={() => onPick(ev.id)}
            >
              <span>{eventLabel(ev)}</span>
            </button>
          ))}
        </div>
      </Modal.Body>
    </Modal>
  );
}

const formatItemsByEventForEmail = (items = [], events = []) => {
  const eventMap = new Map(events.map((ev) => [ev.id, ev]));
  const { grouped, unassigned } = splitItemsByEvent(items, events);

  if (items.length === 0) return "No services selected.";

  const eventBlocks = Array.from(grouped.entries())
    .filter(([, group]) => group.length > 0)
    .map(([eventId, group]) => {
      return [
        eventLabel(eventMap.get(eventId)),
        ...group.map((it) => {
          const qty = Number(it.quantity || 0);
          const price = Number(it.price || 0);
          const line = qty * price;
          return `- ${it.name} (x${qty}) @ ${money(price)} = ${money(line)}`;
        }),
      ].join("\n");
    });

  if (unassigned.length > 0) {
    eventBlocks.push(
      [
        "Unassigned services",
        ...unassigned.map((it) => {
          const qty = Number(it.quantity || 0);
          const price = Number(it.price || 0);
          const line = qty * price;
          return `- ${it.name} (x${qty}) @ ${money(price)} = ${money(line)}`;
        }),
      ].join("\n")
    );
  }

  return eventBlocks.join("\n\n");
};

const formatEventsForEmail = (events = []) => {
  if (!Array.isArray(events) || events.length === 0)
    return "No schedule provided.";
  return events
    .map(
      (ev) =>
        `${ev.type} | ${prettyDate(ev.date)} | ${to12h(ev.startTime)} - ${to12h(
          ev.endTime
        )}${ev.venue ? ` | Venue: ${ev.venue}` : ""}`
    )
    .join("\n");
};

const sendInquiryEmail = async ({
  name,
  email,
  phoneNumber,
  eventDetails,
  items,
  events,
  total,
}) => {
  const message = [
    "New Inquiry Submitted",
    "",
    `Name: ${name || ""}`,
    `Email: ${email || ""}`,
    `Phone: ${phoneNumber || ""}`,
    "",
    "Event Details:",
    `${eventDetails || ""}`,
    "",
    "Event Schedule:",
    formatEventsForEmail(events),
    "",
    "Services by Event:",
    formatItemsByEventForEmail(items, events),
    "",
    "All Items:",
    formatItemsForEmail(items),
    "",
    `Estimated Total: ${money(total)}`,
  ].join("\n");

  return emailjs.send(
    "service_pimfhg7",
    "template_98bu8bi",
    {
      user_name: name || "",
      user_email: email || "",
      user_phone: phoneNumber || "",
      message,
    },
    "sV1cKQAbOd4PLkl38"
  );
};

const Cart = ({ items, setItems }) => {
  const [isSending, setIsSending] = useState(false);
  const navigate = useNavigate();

  // contact fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [eventDetails, setEventDetails] = useState("");

  // event schedule
  const [events, setEvents] = useState([]);
  const [eventDraft, setEventDraft] = useState({
    type: "",
    venue: "",
    date: "",
    startTime: "",
    endTime: "",
  });
  const [inquiryStep, setInquiryStep] = useState("cart");
  const [eventPicker, setEventPicker] = useState(null);

  const mountedRef = useRef(false);

  /* ---------- Hydrate cart and contact drafts from localStorage ---------- */
  useEffect(() => {
    mountedRef.current = true;

    try {
      const raw = localStorage.getItem("cartItems");
      const cached = raw ? JSON.parse(raw) : [];
      if (
        Array.isArray(cached) &&
        typeof setItems === "function" &&
        !equalItems(items, cached)
      ) {
        setItems(cached);
      }
    } catch {}

    try {
      const raw = localStorage.getItem("cartContact");
      if (raw) {
        const parsed = JSON.parse(raw) || {};
        if (parsed.name != null) setName(parsed.name);
        if (parsed.email != null) setEmail(parsed.email);
        if (parsed.phoneNumber != null) setPhoneNumber(parsed.phoneNumber);
        if (parsed.eventDetails != null) setEventDetails(parsed.eventDetails);
        if (Array.isArray(parsed.events)) setEvents(parsed.events);
      }
    } catch {}

    const onUpdate = () => {
      try {
        const raw = localStorage.getItem("cartItems");
        const cached = raw ? JSON.parse(raw) : [];
        if (typeof setItems === "function") {
          if (!equalItems(cached, items)) {
            setItems(cached);
          }
        }
      } catch {}
    };

    window.addEventListener("cart:update", onUpdate);
    return () => {
      mountedRef.current = false;
      window.removeEventListener("cart:update", onUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once

  const persistCart = (next) => {
    try {
      localStorage.setItem("cartItems", JSON.stringify(next));
    } finally {
      window.dispatchEvent(new Event("cart:update"));
    }
  };

  const persistContact = (draft = {}) => {
    const payload = {
      name,
      email,
      phoneNumber,
      eventDetails,
      events,
      ...draft,
    };
    localStorage.setItem("cartContact", JSON.stringify(payload));
  };

  const normalizedEvents = useMemo(
    () =>
      (events || []).map((ev, idx) => ({
        ...ev,
        id: ev.id || `event-${idx}`,
      })),
    [events]
  );

  // keep contact fields in localStorage as user types
  useEffect(() => {
    persistContact();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, email, phoneNumber, eventDetails, events]);

  /* ---------- Cart item controls ---------- */
  const handleQuantityToggle = (item, increment) => {
    const updatedItems = (items || []).map((cartItem) => {
      if (cartItem.id === item.id) {
        const next = increment
          ? Number(cartItem.quantity || 0) + 1
          : Number(cartItem.quantity || 0) - 1;
        return { ...cartItem, quantity: next >= 0 ? next : 0 };
      }
      return cartItem;
    });
    if (!equalItems(updatedItems, items)) {
      setItems(updatedItems);
      persistCart(updatedItems);
    }
  };

  const handleDeleteItem = (itemId) => {
    const updatedItems = (items || []).filter((item) => item.id !== itemId);
    if (!equalItems(updatedItems, items)) {
      setItems(updatedItems);
      persistCart(updatedItems);
    }
  };

  const assignItemToEvent = (itemId, eventId) => {
    const selected = normalizedEvents.find((ev) => ev.id === eventId);
    const updatedItems = (items || []).map((cartItem) =>
      cartItem.id === itemId
        ? {
            ...cartItem,
            eventId: selected ? eventId : "",
            eventAllocations: selected
              ? [
                  {
                    eventId,
                    quantity: Math.max(0, Number(cartItem.quantity || 0)),
                  },
                ]
              : [],
          }
        : cartItem
    );
    if (!equalItems(updatedItems, items)) {
      setItems(updatedItems);
      persistCart(updatedItems);
    }
  };

  const openEventPicker = (item) => {
    setEventPicker({
      itemId: item.id,
      title: `Choose event for ${item.name}`,
      selectedEventId:
        item.eventId || normalizeAllocations(item, normalizedEvents)[0]?.eventId || "",
    });
  };

  const pickEventForItem = (eventId) => {
    if (!eventPicker?.itemId) return;
    assignItemToEvent(eventPicker.itemId, eventId);
    setEventPicker(null);
  };

  const setItemEventQuantity = (itemId, eventId, quantity) => {
    const nextQuantity = Math.max(0, Number(quantity || 0));
    const updatedItems = (items || []).map((cartItem) => {
      if (cartItem.id !== itemId) return cartItem;
      const other = normalizeAllocations(cartItem, normalizedEvents).filter(
        (row) => row.eventId !== eventId
      );
      const next = nextQuantity > 0 ? [...other, { eventId, quantity: nextQuantity }] : other;
      const totalQty = Math.max(0, Number(cartItem.quantity || 0));
      const capped = [];
      let used = 0;
      next.forEach((row) => {
        const remaining = Math.max(0, totalQty - used);
        const qty = Math.min(Math.max(0, Number(row.quantity || 0)), remaining);
        if (qty > 0) {
          capped.push({ eventId: row.eventId, quantity: qty });
          used += qty;
        }
      });
      return {
        ...cartItem,
        eventId: capped.length === 1 && capped[0].quantity === totalQty ? capped[0].eventId : "",
        eventAllocations: capped,
      };
    });
    if (!equalItems(updatedItems, items)) {
      setItems(updatedItems);
      persistCart(updatedItems);
    }
  };

  /* ---------- Event rows ---------- */
  const canAddEvent =
    minLen(eventDraft.type, 2) &&
    !!eventDraft.date &&
    !!eventDraft.startTime &&
    !!eventDraft.endTime;

  const addEventRow = () => {
    if (!canAddEvent) return;
    const next = [
      ...events,
      {
        id: makeEventId(),
        type: eventDraft.type.trim(),
        venue: eventDraft.venue.trim(),
        date: eventDraft.date,
        startTime: eventDraft.startTime,
        endTime: eventDraft.endTime,
      },
    ];
    setEvents(next);
    setEventDraft({ type: "", venue: "", date: "", startTime: "", endTime: "" });
    persistContact({ events: next });
  };

  const removeEventRow = (idx) => {
    const removed = normalizedEvents[idx];
    const next = events.filter((_, i) => i !== idx);
    const updatedItems = (items || []).map((item) =>
      removed?.id
        ? {
            ...item,
            eventId: item.eventId === removed.id ? "" : item.eventId || "",
            eventAllocations: normalizeAllocations(item, normalizedEvents).filter(
              (row) => row.eventId !== removed.id
            ),
          }
        : item
    );
    if (!equalItems(updatedItems, items)) {
      setItems(updatedItems);
      persistCart(updatedItems);
    }
    setEvents(next);
    persistContact({ events: next });
  };

  const clearCartEverywhere = () => {
    if (typeof setItems === "function") setItems([]);
    localStorage.setItem("cartItems", JSON.stringify([]));
    window.dispatchEvent(new Event("cart:update"));
  };

  const clearContactDraft = () => {
    localStorage.removeItem("cartContact");
    setName("");
    setEmail("");
    setPhoneNumber("");
    setEventDetails("");
    setEvents([]);
    setEventDraft({ type: "", venue: "", date: "", startTime: "", endTime: "" });
    setInquiryStep("cart");
  };

  const openFooterAuthModal = () => {
    window.dispatchEvent(new Event("auth:open"));
  };

  /* ---------- Submit inquiry ---------- */
  const handleInquiry = async () => {
    if (isSending) return;

    const auth = getAuth();
    const user = auth.currentUser;

    try {
      if (!user) {
        openFooterAuthModal();
        return;
      }

      setIsSending(true);

      const eventsForSubmit = normalizedEvents;
      const eventIds = new Set(eventsForSubmit.map((ev) => ev.id));
      const itemsForSubmit = (items || []).map((item) => ({
        ...item,
        eventAllocations: normalizeAllocations(item, eventsForSubmit),
        eventId:
          item.eventId && eventIds.has(item.eventId) ? item.eventId : "",
      }));

      const inquiriesRef = collection(db, "inquiries");
      await addDoc(inquiriesRef, {
        items: itemsForSubmit,
        userId: user.uid,
        timestamp: serverTimestamp(),
        eventDetails,
        phoneNumber,
        name,
        email,
        status: "Processing",
        events: eventsForSubmit,
      });

      // EmailJS notification
      try {
        await sendInquiryEmail({
          name,
          email,
          phoneNumber,
          eventDetails,
          items: itemsForSubmit,
          events: eventsForSubmit,
          total,
        });
      } catch (e) {
        console.error("EmailJS failed to send inquiry email:", e);
      }

      clearCartEverywhere();
      clearContactDraft();
      navigate("/inquiries", {
        state: { inquirySubmitted: true },
      });
    } catch (error) {
      console.error("Error sending inquiry:", error);
    } finally {
      setIsSending(false);
    }
  };

  /* ---------- Prefill from user profile ---------- */
  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return;

    const userRef = doc(db, "users", user.uid);
    getDoc(userRef)
      .then((d) => {
        const data = d.data() || {};
        if (!name && data.name) setName(data.name);
        if (!phoneNumber && data.phoneNumber) setPhoneNumber(data.phoneNumber);
        if (!email && user.email) setEmail(user.email);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- Totals ---------- */
  const total = useMemo(() => {
    return (items || []).reduce(
      (sum, it) => sum + Number(it.price || 0) * Number(it.quantity || 0),
      0
    );
  }, [items]);

  const canSubmit =
    (items || []).length > 0 &&
    minLen(name, 2) &&
    emailOk(email) &&
    minLen(eventDetails, 20);

  const stepDefs = [
    { id: "cart", label: "Cart" },
    { id: "contact", label: "Contact" },
    { id: "schedule", label: "Schedule" },
    { id: "review", label: "Review" },
  ];
  const activeStepIndex = Math.max(
    0,
    stepDefs.findIndex((step) => step.id === inquiryStep)
  );
  const hasItems = (items || []).length > 0;
  const contactReady =
    minLen(name, 2) && emailOk(email) && minLen(eventDetails, 20);
  const canGoNext =
    (inquiryStep === "cart" && hasItems) ||
    (inquiryStep === "contact" && contactReady) ||
    inquiryStep === "schedule";
  const goNext = () => {
    const next = stepDefs[Math.min(activeStepIndex + 1, stepDefs.length - 1)];
    if (next) setInquiryStep(next.id);
  };
  const goBack = () => {
    const prev = stepDefs[Math.max(activeStepIndex - 1, 0)];
    if (prev) setInquiryStep(prev.id);
  };

  /* ---------- UI ---------- */
  return (
    <Container className="py-3">
      <div className="d-flex align-items-center justify-content-between mb-2">
        <h2 className="m-0">Cart</h2>
        <Badge bg="secondary" pill>
          {(items || []).reduce((sum, it) => sum + Number(it.quantity || 0), 0)}{" "}
          items
        </Badge>
      </div>

      {hasItems ? (
        <div className="flow-steps mb-3" aria-label="Inquiry steps">
          {stepDefs.map((step, idx) => (
            <button
              key={step.id}
              type="button"
              className={`flow-step ${
                idx === activeStepIndex ? "is-active" : ""
              } ${idx < activeStepIndex ? "is-complete" : ""}`}
              onClick={() => setInquiryStep(step.id)}
            >
              <span>{idx + 1}</span>
              {step.label}
            </button>
          ))}
        </div>
      ) : null}

      {/* Contact and event details */}
      {hasItems && inquiryStep === "contact" ? (
        <Card className="mb-3 shadow-sm border-0">
          <Card.Body>
            <div className="mb-2 fw-semibold">Your contact information</div>

            <Row className="g-2">
              <Col xs={12} md={4}>
                <Form.Group controlId="contactName">
                  <Form.Label>Name</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </Form.Group>
              </Col>
              <Col xs={12} md={4}>
                <Form.Group controlId="contactEmail">
                  <Form.Label>Email Address</Form.Label>
                  <Form.Control
                    type="email"
                    placeholder="Enter Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  {!emailOk(email) && email.length > 0 ? (
                    <Form.Text className="text-danger">
                      Enter a valid email
                    </Form.Text>
                  ) : null}
                </Form.Group>
              </Col>
              <Col xs={12} md={4}>
                <Form.Group controlId="contactPhone">
                  <Form.Label>Phone Number</Form.Label>
                  <Form.Control
                    type="tel"
                    placeholder="(999) 999 9999"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mt-3" controlId="contactMessage">
              <Form.Label>Event Details</Form.Label>
              <Form.Control
                as="textarea"
                placeholder="Please enter detailed information for your inquiry."
                value={eventDetails}
                onChange={(e) => setEventDetails(e.target.value)}
                rows={3}
              />
              <Form.Text muted>
                Provide details on the type of event, venue or location, date
                and time, and the best time to reach you.
              </Form.Text>
              {eventDetails.length > 0 && eventDetails.length < 20 ? (
                <Alert className="mt-2 mb-0" variant="danger">
                  Not enough details to submit an inquiry. Minimum 20
                  characters.
                </Alert>
              ) : null}
            </Form.Group>
          </Card.Body>
        </Card>
      ) : null}

      {hasItems && inquiryStep === "schedule" ? (
        <Card className="mb-3 shadow-sm border-0">
          <Card.Body>
            <div className="fw-semibold mb-2">Event schedule</div>
            <Row className="g-2 align-items-end">
              <Col xs={12} md={3}>
                <Form.Label className="mb-1">Type of event</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Wedding, Birthday, Corporate"
                  value={eventDraft.type}
                  onChange={(e) =>
                    setEventDraft((s) => ({ ...s, type: e.target.value }))
                  }
                />
              </Col>
              <Col xs={12} md={3}>
                <Form.Label className="mb-1">Venue</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Venue name or address"
                  value={eventDraft.venue}
                  onChange={(e) =>
                    setEventDraft((s) => ({ ...s, venue: e.target.value }))
                  }
                />
              </Col>
              <Col xs={6} md={2}>
                <Form.Label className="mb-1">Date</Form.Label>
                <Form.Control
                  type="date"
                  value={eventDraft.date}
                  onChange={(e) =>
                    setEventDraft((s) => ({ ...s, date: e.target.value }))
                  }
                />
              </Col>
              <Col xs={3} md={2}>
                <Form.Label className="mb-1">Start</Form.Label>
                <Form.Control
                  type="time"
                  value={eventDraft.startTime}
                  onChange={(e) =>
                    setEventDraft((s) => ({
                      ...s,
                      startTime: e.target.value,
                    }))
                  }
                />
              </Col>
              <Col xs={3} md={2}>
                <Form.Label className="mb-1">End</Form.Label>
                <Form.Control
                  type="time"
                  value={eventDraft.endTime}
                  onChange={(e) =>
                    setEventDraft((s) => ({
                      ...s,
                      endTime: e.target.value,
                    }))
                  }
                />
              </Col>
              <Col xs={12} md={2} className="d-grid">
                <Button
                  variant="outline-primary"
                  onClick={addEventRow}
                  disabled={!canAddEvent}
                >
                  Add Event
                </Button>
              </Col>
            </Row>

            {events.length > 0 ? (
              <ListGroup className="mt-3">
                {events.map((ev, idx) => (
                  <ListGroup.Item
                    key={`${ev.type}-${ev.date}-${idx}`}
                    className="d-flex justify-content-between align-items-center"
                  >
                    <div>
                      <div className="fw-semibold">{ev.type}</div>
                      <div className="text-muted small">
                        {prettyDate(ev.date)} from {to12h(ev.startTime)} to{" "}
                        {to12h(ev.endTime)}
                      </div>
                      {ev.venue ? (
                        <div className="text-muted small">Venue: {ev.venue}</div>
                      ) : null}
                    </div>
                    <Button
                      size="sm"
                      variant="outline-danger"
                      onClick={() => removeEventRow(idx)}
                    >
                      Remove
                    </Button>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            ) : (
              <Alert className="mt-3 mb-0" variant="light">
                Add one or more event times if you know them. You can continue
                without a schedule.
              </Alert>
            )}

            {normalizedEvents.length > 0 ? (
              <div className="mt-4">
                <div className="fw-semibold mb-2">
                  Connect services to these event dates
                </div>
                <ListGroup>
                  {(items || []).map((item) => {
                    const allocations = normalizeAllocations(
                      item,
                      normalizedEvents
                    );
                    const assigned = allocations.reduce(
                      (sum, row) => sum + row.quantity,
                      0
                    );
                    const totalQty = Math.max(0, Number(item.quantity || 0));
                    const remaining = Math.max(0, totalQty - assigned);

                    return (
                      <ListGroup.Item key={`assign-${item.id}`}>
                        <Row className="g-2 align-items-start">
                          <Col md={4}>
                            <div className="fw-semibold">{item.name}</div>
                            <div className="text-muted small">
                              Total qty {totalQty} ·{" "}
                              {money(Number(item.price || 0) * totalQty)}
                            </div>
                            <div
                              className={
                                remaining > 0
                                  ? "text-warning small mt-1"
                                  : "text-success small mt-1"
                              }
                            >
                              {remaining > 0
                                ? `${remaining} unassigned`
                                : "Fully assigned"}
                            </div>
                          </Col>
                          <Col md={8}>
                            {totalQty <= 1 ? (
                              <>
                                <Form.Label className="mb-1 small">
                                  Event date
                                </Form.Label>
                                <Button
                                  type="button"
                                  variant="outline-secondary"
                                  className="event-picker-trigger"
                                  onClick={() => openEventPicker(item)}
                                >
                                  {allocationSummary(item, normalizedEvents)}
                                </Button>
                              </>
                            ) : (
                              <Row className="g-2">
                                {normalizedEvents.map((ev) => {
                                  const value =
                                    allocations.find(
                                      (row) => row.eventId === ev.id
                                    )?.quantity || "";
                                  return (
                                    <Col xs={12} key={`${item.id}-${ev.id}`}>
                                      <Form.Label className="mb-1 small">
                                        {eventLabel(ev)}
                                      </Form.Label>
                                      <Form.Control
                                        type="number"
                                        min="0"
                                        max={totalQty}
                                        inputMode="numeric"
                                        value={value}
                                        placeholder="0"
                                        onChange={(e) =>
                                          setItemEventQuantity(
                                            item.id,
                                            ev.id,
                                            e.target.value
                                          )
                                        }
                                      />
                                    </Col>
                                  );
                                })}
                              </Row>
                            )}
                          </Col>
                        </Row>
                      </ListGroup.Item>
                    );
                  })}
                </ListGroup>
              </div>
            ) : null}
          </Card.Body>
        </Card>
      ) : null}

      {!hasItems ? (
        <p>No items in cart</p>
      ) : inquiryStep === "cart" ? (
        (items || []).map((item) => {
          const media = Array.isArray(item.media) ? item.media : [];
          const cover = media[0];
          return (
            <Card key={item.id} className="mb-3 shadow-sm border-0">
              <Row className="g-0">
                <Col xs={12} sm={4} md={3}>
                  <div
                    style={{
                      width: "100%",
                      paddingTop: "56.25%",
                      position: "relative",
                      backgroundColor: "#f8f9fa",
                      borderTopLeftRadius: ".5rem",
                      borderBottomLeftRadius: ".5rem",
                      overflow: "hidden",
                    }}
                  >
                    {cover ? (
                      cover.type === "video" ? (
                        <video
                          src={cover.url}
                          muted
                          controls
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <img
                          src={cover.url}
                          alt={item.name}
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      )
                    ) : (
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#999",
                          fontSize: 12,
                        }}
                      >
                        No media
                      </div>
                    )}
                  </div>
                </Col>

                <Col xs={12} sm={8} md={9}>
                  <Card.Body className="h-100 d-flex flex-column">
                    <div className="d-flex justify-content-between align-items-start">
                      <Card.Title className="mb-1">{item.name}</Card.Title>
                      <Badge bg="dark">{money(item.price)}</Badge>
                    </div>

                    {item.description ? (
                      <Card.Text className="text-muted mb-2">
                        {item.description}
                      </Card.Text>
                    ) : null}

                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      <span className="fw-semibold">Quantity:</span>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleQuantityToggle(item, false)}
                      >
                        −
                      </Button>
                      <span style={{ minWidth: 24, textAlign: "center" }}>
                        {item.quantity}
                      </span>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleQuantityToggle(item, true)}
                      >
                        +
                      </Button>
                      <Button
                        size="sm"
                        variant="outline-danger"
                        className="ms-2"
                        onClick={() => handleDeleteItem(item.id)}
                      >
                        Delete
                      </Button>
                    </div>

                    {normalizedEvents.length > 0 ? (
                      <Form.Group className="mt-3">
                        <Form.Label className="mb-1">
                          Assign this service to an event
                        </Form.Label>
                        <Button
                          type="button"
                          variant="outline-secondary"
                          className="event-picker-trigger"
                          onClick={() => openEventPicker(item)}
                        >
                          {allocationSummary(item, normalizedEvents)}
                        </Button>
                      </Form.Group>
                    ) : (
                      <div className="mt-3 small text-muted">
                        Add event dates in the schedule step to connect this
                        service to a specific event.
                      </div>
                    )}

                    <div className="mt-2 small text-muted">
                      Line total:{" "}
                      {money(
                        Number(item.price || 0) * Number(item.quantity || 0)
                      )}
                    </div>
                  </Card.Body>
                </Col>
              </Row>
            </Card>
          );
        })
      ) : null}

      {hasItems && inquiryStep === "review" ? (
        <Card className="mb-3 shadow-sm border-0">
          <Card.Body>
            <div className="fw-semibold mb-3">Review your inquiry</div>
            <Row className="g-3">
              <Col md={6}>
                <div className="text-muted small">Contact</div>
                <div className="fw-semibold">{name || "Name missing"}</div>
                <div>{email || "Email missing"}</div>
                <div>{phoneNumber || "No phone provided"}</div>
                <p className="mt-2 mb-0">{eventDetails}</p>
              </Col>
              <Col md={6}>
                <div className="text-muted small">Schedule</div>
                {events.length > 0 ? (
                  <ul className="ps-3 mb-0">
                    {events.map((ev, idx) => (
                      <li key={`${ev.type}-${idx}`}>
                        {ev.type} on {prettyDate(ev.date)} from{" "}
                        {to12h(ev.startTime)} to {to12h(ev.endTime)}
                        {ev.venue ? ` at ${ev.venue}` : ""}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div>No schedule added yet.</div>
                )}
              </Col>
            </Row>
            <hr />
            <div className="fw-semibold mb-2">Selected services</div>
            <ListGroup>
              {(items || []).map((item) => (
                <ListGroup.Item
                  key={`review-${item.id}`}
                  className="d-flex justify-content-between align-items-start gap-3"
                >
                  <span>
                    <span className="fw-semibold">
                      {item.name} x {item.quantity}
                    </span>
                    <div className="text-muted small">
                      {allocationSummary(item, normalizedEvents)}
                    </div>
                  </span>
                  <span>
                    {money(Number(item.price || 0) * Number(item.quantity || 0))}
                  </span>
                </ListGroup.Item>
              ))}
            </ListGroup>
          </Card.Body>
        </Card>
      ) : null}

      {(items || []).length > 0 && (
        <Card className="mb-3 border-0 shadow-sm">
          <Card.Body className="d-flex justify-content-between align-items-center">
            <div className="fw-semibold">Cart total</div>
            <div className="fs-5">{money(total)}</div>
          </Card.Body>
        </Card>
      )}

      {hasItems ? (
        <div className="flow-actions mb-3">
          <Button
            variant="outline-secondary"
            onClick={goBack}
            disabled={activeStepIndex === 0 || isSending}
          >
            Back
          </Button>
          {inquiryStep !== "review" ? (
            <Button variant="primary" onClick={goNext} disabled={!canGoNext}>
              Continue
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={handleInquiry}
              disabled={!canSubmit || isSending}
            >
              {isSending ? "Sending..." : "Send Inquiry"}
            </Button>
          )}
        </div>
      ) : null}

      {!canSubmit && (items || []).length > 0 ? (
        <Alert className="mt-3" variant="danger">
          Fill in your name, a valid email, and at least 20 characters of event
          details.
        </Alert>
      ) : null}

      {(items || []).length === 0 ? (
        <Alert className="mt-3" variant="danger">
          Add something to the cart to send an inquiry.
        </Alert>
      ) : null}

      <EventPickerModal
        show={Boolean(eventPicker)}
        title={eventPicker?.title}
        events={normalizedEvents}
        selectedEventId={eventPicker?.selectedEventId || ""}
        onPick={pickEventForItem}
        onHide={() => setEventPicker(null)}
      />
    </Container>
  );
};

export default Cart;
