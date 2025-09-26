// src/components/cart/PreviousInquiries.jsx
import React, { useState, useEffect } from "react";
import { Table, Badge, Card, Row, Col, ListGroup } from "react-bootstrap";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import db from "../../api/firestore/firestore";
import {
  to12h,
  prettyDate,
  prettyDateTimeFromTs,
} from "../../utils/formatters";
import ContractModal from "../contracts/ContractModal";

const money = (v) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    Number(v || 0)
  );

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

// math matches admin
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

const ContactBlock = ({ inquiry }) => {
  const hasContact =
    inquiry?.name ||
    inquiry?.email ||
    inquiry?.phoneNumber ||
    inquiry?.eventDetails;
  if (!hasContact) return null;
  return (
    <div className="mt-2">
      <div className="fw-semibold mb-1">Contact</div>
      <div className="text-muted small">
        {inquiry?.name ? <div>Name: {inquiry.name}</div> : null}
        {inquiry?.email ? <div>Email: {inquiry.email}</div> : null}
        {inquiry?.phoneNumber ? <div>Phone: {inquiry.phoneNumber}</div> : null}
        {inquiry?.eventDetails ? (
          <div>Notes: {inquiry.eventDetails}</div>
        ) : null}
      </div>
    </div>
  );
};

const ScheduleBlock = ({ inquiry }) => {
  const events = Array.isArray(inquiry?.events) ? inquiry.events : [];
  if (events.length === 0) return null;
  return (
    <div className="mt-2">
      <div className="fw-semibold mb-1">Event schedule</div>
      <ListGroup>
        {events.map((e, i) => (
          <ListGroup.Item key={`${e?.type || "event"}-${e?.date || i}`}>
            <div className="fw-semibold">{e?.type || "Event"}</div>
            <div className="text-muted small">
              {e?.date ? prettyDate(e.date) : "Date N/A"} from{" "}
              {e?.startTime ? to12h(e.startTime) : "Start N/A"} to{" "}
              {e?.endTime ? to12h(e.endTime) : "End N/A"}
            </div>
          </ListGroup.Item>
        ))}
      </ListGroup>
    </div>
  );
};

const PreviousInquiries = () => {
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showContract, setShowContract] = useState(false);
  const [contractInquiry, setContractInquiry] = useState(null);
  const [activeContract, setActiveContract] = useState(null);

  const auth = getAuth();

  useEffect(() => {
    let stopAuth = () => {};
    let stopSnap = () => {};

    stopAuth = onAuthStateChanged(auth, (user) => {
      stopSnap?.();
      setInquiries([]);

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

  if (loading) {
    return (
      <div>
        <h2>Previous Inquiries</h2>
        <p>Loading...</p>
      </div>
    );
  }

  if (inquiries.length === 0) {
    return (
      <div>
        <h2>Previous Inquiries</h2>
        <p>No previous inquiries found</p>
      </div>
    );
  }
  const openClientContract = (inq, c) => {
    setContractInquiry(inq);
    setActiveContract(c);
    setShowContract(true);
  };

  return (
    <div>
      <h2>Previous Inquiries</h2>

      {/* Mobile cards */}
      <Row className="g-3 d-md-none">
        {inquiries.map((inquiry) => {
          const dateStr = prettyDateTimeFromTs(inquiry?.timestamp);
          const {
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
          } = calcTotals(inquiry);

          return (
            <Col xs={12} key={inquiry.id}>
              <Card className="shadow-sm">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-start mb-1">
                    <div className="fw-semibold">{dateStr}</div>
                    <StatusBadge status={inquiry.status} />
                  </div>
                  <ContactBlock inquiry={inquiry} />
                  <ScheduleBlock inquiry={inquiry} />{" "}
                  {/* Contracts for this inquiry */}
                  <div className="fw-semibold mt-3 mb-1">Contracts</div>
                  {(inquiry.contracts || []).length === 0 ? (
                    <div className="text-muted small">No contracts yet</div>
                  ) : (
                    <ul className="mb-2">
                      {inquiry.contracts.map((c) => (
                        <li key={`${inquiry.id}-c-${c.id}`}>
                          <button
                            type="button"
                            className="btn btn-link p-0 align-baseline"
                            onClick={() => openClientContract(inquiry, c)}
                          >
                            {c.title}
                          </button>
                          {c.clientSignature ? (
                            <Badge bg="success" className="ms-2">
                              Signed
                            </Badge>
                          ) : (
                            <Badge bg="warning" text="dark" className="ms-2">
                              Pending
                            </Badge>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="fw-semibold mt-3 mb-1">Items</div>
                  <ul className="mb-2">
                    {(inquiry.items || []).map((item, idx) => (
                      <li key={`${inquiry.id}-m-name-${idx}`}>
                        {item.name}: {money(item.price)} x {item.quantity}
                      </li>
                    ))}
                  </ul>
                  <div className="border-top pt-2">
                    <div className="d-flex justify-content-between">
                      <span>Subtotal</span>
                      <span>{money(subtotal)}</span>
                    </div>
                    {discountApplied > 0 ? (
                      <div className="d-flex justify-content-between text-success">
                        <span>
                          Discount
                          {dType === "percent"
                            ? ` (${Number(dRaw || 0)}%)`
                            : ""}
                        </span>
                        <span>{money(discountApplied)}</span>
                      </div>
                    ) : null}
                    {feeApplied > 0 ? (
                      <div className="d-flex justify-content-between">
                        <span>
                          Processing fee
                          {fType === "percent"
                            ? ` (${Number(fRaw || 0)}%)`
                            : ""}
                        </span>
                        <span>{money(feeApplied)}</span>
                      </div>
                    ) : null}
                    {travel > 0 ? (
                      <div className="d-flex justify-content-between">
                        <span>Travel</span>
                        <span>{money(travel)}</span>
                      </div>
                    ) : null}
                    {/* Net total before tax */}
                    <div className="d-flex justify-content-between">
                      <span>Net total</span>
                      <span>
                        {money(baseAfterDiscount + feeApplied + travel)}
                      </span>
                    </div>

                    {taxApplied > 0 ? (
                      <div className="d-flex justify-content-between">
                        <span>Tax ({Number(taxPercent)}%)</span>
                        <span>{money(taxApplied)}</span>
                      </div>
                    ) : null}
                    <div className="d-flex justify-content-between fw-semibold mt-1">
                      <span>Total</span>
                      <span>{money(total)}</span>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          );
        })}
      </Row>

      {/* Desktop table */}
      <Table striped bordered hover responsive className="d-none d-md-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Contact and notes</th>
            <th>Items and price</th>
            <th>Qty</th>
            <th>Totals</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {inquiries.map((inquiry) => {
            const dateStr = prettyDateTimeFromTs(inquiry?.timestamp);
            const {
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
            } = calcTotals(inquiry);

            return (
              <tr key={inquiry.id}>
                <td>{dateStr}</td>
                {/* Contact and schedule */}
                <td style={{ minWidth: 260 }}>
                  {inquiry?.name ? (
                    <div>
                      <strong>Name:</strong> {inquiry.name}
                    </div>
                  ) : null}
                  {inquiry?.email ? (
                    <div>
                      <strong>Email:</strong> {inquiry.email}
                    </div>
                  ) : null}
                  {inquiry?.phoneNumber ? (
                    <div>
                      <strong>Phone:</strong> {inquiry.phoneNumber}
                    </div>
                  ) : null}
                  {inquiry?.eventDetails ? (
                    <div className="text-muted">
                      <strong>Notes:</strong> {inquiry.eventDetails}
                    </div>
                  ) : null}
                  {Array.isArray(inquiry.events) &&
                  inquiry.events.length > 0 ? (
                    <div className="mt-1">
                      <strong>Schedule:</strong>
                      <ul className="mb-0">
                        {inquiry.events.map((e, i) => (
                          <li key={`${inquiry.id}-ev-${i}`}>
                            {e?.type || "Event"} on{" "}
                            {e?.date ? prettyDate(e.date) : "N/A"} from{" "}
                            {e?.startTime ? to12h(e.startTime) : "N/A"} to{" "}
                            {e?.endTime ? to12h(e.endTime) : "N/A"}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </td>
                {/* Items */}
                <td>
                  <ul className="mb-2">
                    {(inquiry.items || []).map((item, idx) => (
                      <li key={`${inquiry.id}-name-${idx}`}>
                        {item.name}: {money(item.price)}
                      </li>
                    ))}
                  </ul>
                </td>
                {/* Qty */}
                <td>
                  <ul className="mb-0">
                    {(inquiry.items || []).map((item, idx) => (
                      <li key={`${inquiry.id}-qty-${idx}`}>{item.quantity}</li>
                    ))}
                  </ul>
                </td>
                {/* Totals */}
                <td>
                  <div>Subtotal: {money(subtotal)}</div>
                  {discountApplied > 0 ? (
                    <div className="text-success">
                      Discount
                      {dType === "percent"
                        ? ` (${Number(dRaw || 0)}%)`
                        : ""}: {money(discountApplied)}
                    </div>
                  ) : null}
                  {feeApplied > 0 ? (
                    <div>
                      Processing fee
                      {fType === "percent"
                        ? ` (${Number(fRaw || 0)}%)`
                        : ""}: {money(feeApplied)}
                    </div>
                  ) : null}
                  {travel > 0 ? <div>Travel: {money(travel)}</div> : null}
                  <div>
                    Net total: {money(baseAfterDiscount + feeApplied + travel)}
                  </div>

                  {taxApplied > 0 ? (
                    <div>
                      Tax ({Number(taxPercent)}%): {money(taxApplied)}
                    </div>
                  ) : null}
                  <div className="fw-semibold">Total: {money(total)}</div>
                </td>
                {/* Contracts list */}
                {(inquiry.contracts || []).length > 0 ? (
                  <div className="mt-1">
                    <strong>Contracts:</strong>
                    <ul className="mb-0">
                      {inquiry.contracts.map((c) => (
                        <li key={`${inquiry.id}-ct-${c.id}`}>
                          <button
                            type="button"
                            className="btn btn-link p-0 align-baseline"
                            onClick={() => openClientContract(inquiry, c)}
                          >
                            {c.title}
                          </button>
                          {c.clientSignature ? (
                            <Badge bg="success" className="ms-2">
                              Signed
                            </Badge>
                          ) : (
                            <Badge bg="warning" text="dark" className="ms-2">
                              Pending
                            </Badge>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <td>
                  <StatusBadge status={inquiry.status} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>
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
