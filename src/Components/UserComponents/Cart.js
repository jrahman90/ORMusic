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
  InputGroup,
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
import db from "../../api/firestore/firestore";
import PreviousInquiries from "./PreviousInquiries";

/* ---------- Helpers ---------- */
const money = (v) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    Number(v || 0)
  );
const emailOk = (v) => /\S+@\S+\.\S+/.test(String(v || "").trim());
const minLen = (v, n) => String(v || "").trim().length >= n;

// shallowish deep equal for small arrays of plain objects
function equalItems(a, b) {
  try {
    return JSON.stringify(a || []) === JSON.stringify(b || []);
  } catch {
    return false;
  }
}

const Cart = ({ items, setItems }) => {
  const [show, setShow] = useState(false);
  const [successMessage, setSuccessMessage] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // contact fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [eventDetails, setEventDetails] = useState("");

  // event schedule
  const [events, setEvents] = useState([]);
  const [eventDraft, setEventDraft] = useState({
    type: "",
    date: "",
    startTime: "",
    endTime: "",
  });

  const [userData, setUserData] = useState({});
  const mountedRef = useRef(false);

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

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
      // announce change to any listeners such as navbar badge
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
        type: eventDraft.type.trim(),
        date: eventDraft.date,
        startTime: eventDraft.startTime,
        endTime: eventDraft.endTime,
      },
    ];
    setEvents(next);
    setEventDraft({ type: "", date: "", startTime: "", endTime: "" });
    persistContact({ events: next });
  };

  const removeEventRow = (idx) => {
    const next = events.filter((_, i) => i !== idx);
    setEvents(next);
    persistContact({ events: next });
  };

  const clearCartEverywhere = () => {
    if (typeof setItems === "function") setItems([]);
    localStorage.setItem("cartItems", JSON.stringify([]));
    window.dispatchEvent(new Event("cart:update"));
  };

  /* ---------- Submit inquiry ---------- */
  const handleInquiry = async () => {
    if (isSending) return;
    const auth = getAuth();
    const user = auth.currentUser;

    try {
      if (!user) {
        handleShow();
        return;
      }

      setIsSending(true);

      const inquiriesRef = collection(db, "inquiries");
      await addDoc(inquiriesRef, {
        items,
        userId: user.uid,
        timestamp: serverTimestamp(),
        eventDetails,
        phoneNumber,
        name,
        email,
        status: "Processing",
        events,
      });

      clearCartEverywhere();
      setSuccessMessage(true);
      setTimeout(() => setSuccessMessage(false), 3000);
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
        setUserData(data);
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

      {/* Contact and event details */}
      {(items || []).length > 0 ? (
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
                Provide details on the type of event, venue, date and time, and
                the best time to reach you.
              </Form.Text>
              {eventDetails.length > 0 && eventDetails.length < 20 ? (
                <Alert className="mt-2 mb-0" variant="danger">
                  Not enough details to submit an inquiry. Minimum 20
                  characters.
                </Alert>
              ) : null}
            </Form.Group>

            {/* Event schedule builder */}
            <div className="mt-4">
              <div className="fw-semibold mb-2">Event schedule</div>
              <Row className="g-2 align-items-end">
                <Col xs={12} md={4}>
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
                    disabled={
                      !(
                        eventDraft.type &&
                        eventDraft.date &&
                        eventDraft.startTime &&
                        eventDraft.endTime
                      )
                    }
                  >
                    Add Event
                  </Button>
                </Col>
              </Row>

              {events.length > 0 && (
                <ListGroup className="mt-3">
                  {events.map((ev, idx) => (
                    <ListGroup.Item
                      key={`${ev.type}-${ev.date}-${idx}`}
                      className="d-flex justify-content-between align-items-center"
                    >
                      <div>
                        <div className="fw-semibold">{ev.type}</div>
                        <div className="text-muted small">
                          {ev.date} from {ev.startTime} to {ev.endTime}
                        </div>
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
              )}
            </div>
          </Card.Body>
        </Card>
      ) : null}

      {(items || []).length === 0 ? (
        <p>No items in cart</p>
      ) : (
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

                    <div className="d-flex align-items-center gap-2">
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
      )}

      {(items || []).length > 0 && (
        <Card className="mb-3 border-0 shadow-sm">
          <Card.Body className="d-flex justify-content-between align-items-center">
            <div className="fw-semibold">Cart total</div>
            <div className="fs-5">{money(total)}</div>
          </Card.Body>
        </Card>
      )}

      <Button
        variant="primary"
        onClick={handleInquiry}
        disabled={!canSubmit || isSending}
      >
        {isSending ? "Sending..." : "Send Inquiry"}
      </Button>

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

      {successMessage ? (
        <Alert className="mt-3" variant="success">
          Your request was sent successfully. Our team will reach out soon.
        </Alert>
      ) : null}

      <div className="line"></div>
      <PreviousInquiries />

      <Modal
        show={show}
        onHide={handleClose}
        backdrop="static"
        keyboard={false}
      >
        <Modal.Header closeButton>
          <Modal.Title>Sign in required</Modal.Title>
        </Modal.Header>
        <Modal.Body>Please sign in to submit an inquiry.</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default Cart;
