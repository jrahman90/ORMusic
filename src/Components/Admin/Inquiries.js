import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  Col,
  Row,
  Container,
  Button,
  Form,
  InputGroup,
  Badge,
  Accordion,
  Image,
  Spinner,
} from "react-bootstrap";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  doc,
  deleteDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import db from "../../api/firestore/firestore";
import {
  to12h,
  prettyDate,
  prettyDateTimeFromTs,
  prettyDateTimeMMDDYY, // new formatter for deposits
} from "../../utils/formatters";
import ContractModal from "../contracts/ContractModal";

const money = (v) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    Number(v || 0)
  );

const statusOptions = [
  "Processing",
  "Pending",
  "Approved",
  "Confirmed",
  "Rejected",
  "Cancelled",
  "Completed",
];

function ContactBlock({ inq }) {
  if (!inq?.name && !inq?.email && !inq?.phoneNumber && !inq?.eventDetails) {
    return null;
  }
  return (
    <>
      <div className="fw-semibold mt-3 mb-2">Contact</div>
      <div className="small text-muted">
        {inq?.name ? <div>Name: {inq.name}</div> : null}
        {inq?.email ? (
          <div>
            Email:{" "}
            <a href={`mailto:${inq.email}`} className="text-reset">
              {inq.email}
            </a>
          </div>
        ) : null}
        {inq?.phoneNumber ? <div>Phone: {inq.phoneNumber}</div> : null}
      </div>
      {inq?.eventDetails ? (
        <Card className="mt-2">
          <Card.Body className="py-2">
            <div className="small">{inq.eventDetails}</div>
          </Card.Body>
        </Card>
      ) : null}
    </>
  );
}

function EventSchedule({ inq }) {
  const events = Array.isArray(inq?.events) ? inq.events : [];
  if (events.length === 0) return null;
  return (
    <>
      <div className="fw-semibold mt-3 mb-2">Event schedule</div>
      <div className="d-flex flex-column gap-2">
        {events.map((e, i) => (
          <Card key={`${inq.id}-ev-${i}`}>
            <Card.Body className="py-2">
              <div className="fw-semibold">{e?.type || "Event"}</div>
              <div className="small text-muted">
                {e?.date ? prettyDate(e.date) : "Date N/A"} from{" "}
                {e?.startTime ? to12h(e.startTime) : "Start N/A"} to{" "}
                {e?.endTime ? to12h(e.endTime) : "End N/A"}
              </div>
            </Card.Body>
          </Card>
        ))}
      </div>
    </>
  );
}

// Admin can edit schedule before contracts exist
function EventScheduleEditor({ inq, onSave, busy }) {
  const [rows, setRows] = useState(
    Array.isArray(inq?.events) ? inq.events : []
  );
  const [draft, setDraft] = useState({
    type: "",
    date: "",
    startTime: "",
    endTime: "",
  });

  useEffect(() => {
    setRows(Array.isArray(inq?.events) ? inq.events : []);
  }, [inq?.events]);

  const canAdd =
    String(draft.type || "").trim().length > 1 &&
    draft.date &&
    draft.startTime &&
    draft.endTime;

  const addRow = () => {
    if (!canAdd) return;
    setRows((r) => [...r, { ...draft }]);
    setDraft({ type: "", date: "", startTime: "", endTime: "" });
  };

  const removeRow = (idx) => setRows(rows.filter((_, i) => i !== idx));

  const changeRow = (idx, key, val) => {
    const next = rows.slice();
    next[idx] = { ...next[idx], [key]: val };
    setRows(next);
  };

  return (
    <div className="mt-3">
      <div className="fw-semibold mb-2">Event schedule, admin edit</div>

      {rows.length > 0 ? (
        <div className="d-flex flex-column gap-2 mb-2">
          {rows.map((e, i) => (
            <Card key={`edit-ev-${inq.id}-${i}`}>
              <Card.Body className="py-2">
                <Row className="g-2">
                  <Col xs={12} md={3}>
                    <Form.Label className="mb-1 small">Type</Form.Label>
                    <Form.Control
                      value={e.type || ""}
                      onChange={(ev) => changeRow(i, "type", ev.target.value)}
                      disabled={busy}
                    />
                  </Col>
                  <Col xs={6} md={3}>
                    <Form.Label className="mb-1 small">Date</Form.Label>
                    <Form.Control
                      type="date"
                      value={e.date || ""}
                      onChange={(ev) => changeRow(i, "date", ev.target.value)}
                      disabled={busy}
                    />
                  </Col>
                  <Col xs={3} md={3}>
                    <Form.Label className="mb-1 small">Start</Form.Label>
                    <Form.Control
                      type="time"
                      value={e.startTime || ""}
                      onChange={(ev) =>
                        changeRow(i, "startTime", ev.target.value)
                      }
                      disabled={busy}
                    />
                  </Col>
                  <Col xs={3} md={3}>
                    <Form.Label className="mb-1 small">End</Form.Label>
                    <Form.Control
                      type="time"
                      value={e.endTime || ""}
                      onChange={(ev) =>
                        changeRow(i, "endTime", ev.target.value)
                      }
                      disabled={busy}
                    />
                  </Col>
                </Row>
                <div className="d-flex justify-content-end mt-2">
                  <Button
                    size="sm"
                    variant="outline-danger"
                    onClick={() => removeRow(i)}
                    disabled={busy}
                  >
                    Remove
                  </Button>
                </div>
              </Card.Body>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-muted small mb-2">No events yet</div>
      )}

      <Row className="g-2 align-items-end">
        <Col xs={12} md={3}>
          <Form.Label className="mb-1 small">Type</Form.Label>
          <Form.Control
            value={draft.type}
            onChange={(e) => setDraft((s) => ({ ...s, type: e.target.value }))}
            disabled={busy}
          />
        </Col>
        <Col xs={6} md={3}>
          <Form.Label className="mb-1 small">Date</Form.Label>
          <Form.Control
            type="date"
            value={draft.date}
            onChange={(e) => setDraft((s) => ({ ...s, date: e.target.value }))}
            disabled={busy}
          />
        </Col>
        <Col xs={3} md={3}>
          <Form.Label className="mb-1 small">Start</Form.Label>
          <Form.Control
            type="time"
            value={draft.startTime}
            onChange={(e) =>
              setDraft((s) => ({ ...s, startTime: e.target.value }))
            }
            disabled={busy}
          />
        </Col>
        <Col xs={3} md={3}>
          <Form.Label className="mb-1 small">End</Form.Label>
          <Form.Control
            type="time"
            value={draft.endTime}
            onChange={(e) =>
              setDraft((s) => ({ ...s, endTime: e.target.value }))
            }
            disabled={busy}
          />
        </Col>
      </Row>

      <div className="d-flex gap-2 mt-2">
        <Button
          size="sm"
          variant="outline-primary"
          onClick={addRow}
          disabled={!canAdd || busy}
        >
          Add event
        </Button>
        <Button size="sm" onClick={() => onSave(rows)} disabled={busy}>
          Save schedule
        </Button>
      </div>
    </div>
  );
}
const getHeaderDateLines = (inq) => {
  const events = Array.isArray(inq?.events) ? inq.events : [];

  // If there are scheduled events, show one line per event
  if (events.length > 0) {
    const visible = events.filter(
      (e) => e && (e.date || e.startTime || e.endTime)
    );

    if (visible.length === 0) {
      return prettyDateTimeFromTs(inq?.timestamp);
    }

    return (
      <>
        {visible.map((e, idx) => {
          const dateLabel = e.date ? prettyDate(e.date) : "Date N/A";

          const start = e.startTime ? to12h(e.startTime) : "";
          const end = e.endTime ? to12h(e.endTime) : "";

          let timePart = "";
          if (start && end) {
            // example: 7 PM - 12 AM
            timePart = `${start} - ${end}`;
          } else if (start) {
            timePart = start;
          } else if (end) {
            timePart = end;
          }

          const label = timePart ? `${dateLabel}, ${timePart}` : dateLabel;

          return <div key={`hdr-${inq.id}-ev-${idx}`}>{label}</div>;
        })}
      </>
    );
  }

  // No events yet, keep original behavior
  return prettyDateTimeFromTs(inq?.timestamp);
};

function FormModal({ show, onHide, title, children }) {
  return (
    <div
      className={`modal fade ${show ? "show" : ""}`}
      style={{ display: show ? "block" : "none", background: "rgba(0,0,0,.5)" }}
      role="dialog"
      aria-modal={show ? "true" : "false"}
    >
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <div className="modal-title fw-semibold">{title}</div>
            <button
              type="button"
              className="btn-close"
              onClick={onHide}
              aria-label="Close"
            />
          </div>
          <div className="modal-body">{children}</div>
        </div>
      </div>
    </div>
  );
}

export default function Inquiries() {
  const [inquiries, setInquiries] = useState([]);
  const [saving, setSaving] = useState({});
  const [adding, setAdding] = useState({});
  const [itemDrafts, setItemDrafts] = useState({});
  const [discountDraft, setDiscountDraft] = useState({});
  const [taxDraft, setTaxDraft] = useState({});
  const [travelDraft, setTravelDraft] = useState({});
  const [feeDraft, setFeeDraft] = useState({});
  const [catalog, setCatalog] = useState([]);
  const [showContract, setShowContract] = useState(false);
  const [contractMode, setContractMode] = useState("admin");
  const [contractInquiry, setContractInquiry] = useState(null);
  const [activeContract, setActiveContract] = useState(null);

  // deposits state and expansion state for compact accordion
  const [depositDraft, setDepositDraft] = useState({});
  const [expanded, setExpanded] = useState({});
  const [loading, setLoading] = useState(true);

  // Manual inquiry creation + user assignment
  const [users, setUsers] = useState([]);
  const [showNewInquiry, setShowNewInquiry] = useState(false);
  const [creatingInquiry, setCreatingInquiry] = useState(false);
  const [showAssignUser, setShowAssignUser] = useState(false);
  const [assigningInquiry, setAssigningInquiry] = useState(null); // { id, ...data }
  const [assignUserSearch, setAssignUserSearch] = useState("");
  const [assignSelectedUser, setAssignSelectedUser] = useState(null);
  const [savingUserAssign, setSavingUserAssign] = useState(false);

  const [newInquiryDraft, setNewInquiryDraft] = useState({
    name: "",
    email: "",
    phoneNumber: "",
    eventDetails: "",
    status: "Processing",
  });

  const [userSearch, setUserSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);

  // load inquiries realtime
  useEffect(() => {
    const ref = collection(db, "inquiries");
    const q = query(ref, orderBy("timestamp", "desc"));
    const stop = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setInquiries(rows);
        setLoading(false);

        // seed drafts
        setDiscountDraft((prev) => {
          const next = { ...prev };
          rows.forEach((inq) => {
            if (!next[inq.id]) {
              const type =
                inq.discountType === "percent" || inq.discountType === "amount"
                  ? inq.discountType
                  : "amount";
              const value =
                inq.discountType === "percent"
                  ? Number(inq.discountValue || 0)
                  : inq.discount != null
                  ? Number(inq.discount || 0)
                  : Number(inq.discountValue || 0) || 0;
              next[inq.id] = { type, value };
            }
          });
          return next;
        });
        setTaxDraft((prev) => {
          const next = { ...prev };
          rows.forEach((inq) => {
            if (next[inq.id] == null)
              next[inq.id] = Number(inq.taxPercent || 0);
          });
          return next;
        });
        setTravelDraft((prev) => {
          const next = { ...prev };
          rows.forEach((inq) => {
            if (next[inq.id] == null)
              next[inq.id] = Number(inq.travelAmount || 0);
          });
          return next;
        });
        setFeeDraft((prev) => {
          const next = { ...prev };
          rows.forEach((inq) => {
            if (!next[inq.id]) {
              const type =
                inq.feeType === "percent" || inq.feeType === "amount"
                  ? inq.feeType
                  : "amount";
              const value = Number(inq.feeValue || 0);
              next[inq.id] = { type, value };
            }
          });
          return next;
        });
        setItemDrafts((prev) => {
          const next = { ...prev };
          rows.forEach((inq) => {
            const items = Array.isArray(inq.items) ? inq.items : [];
            if (!next[inq.id]) next[inq.id] = {};
            items.forEach((it, idx) => {
              if (!next[inq.id][idx]) {
                next[inq.id][idx] = {
                  price: it.price ?? 0,
                  quantity: it.quantity ?? 1,
                };
              }
            });
          });
          return next;
        });
      },
      (err) => {
        console.error("Realtime inquiries error:", err);
        setLoading(false);
      }
    );
    return () => stop();
  }, []);

  // NEW: load users for search/assignment
  useEffect(() => {
    const ref = collection(db, "users");
    const q = query(ref, orderBy("name", "asc"));
    const stop = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setUsers(rows);
      },
      (err) => console.error("Users load error:", err)
    );
    return () => stop();
  }, []);

  // catalog realtime
  useEffect(() => {
    const ref = collection(db, "rentals");
    const q = query(ref, orderBy("name", "asc"));
    const stop = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setCatalog(rows);
      },
      (err) => console.error("Rentals catalog error:", err)
    );
    return () => stop();
  }, []);

  const openAddContract = (inq) => {
    setContractInquiry(inq);
    setActiveContract(null);
    setContractMode("admin");
    setShowContract(true);
  };

  const openViewContractAdmin = (inq, contract, sign = false) => {
    setContractInquiry(inq);
    setActiveContract(contract);
    setContractMode("admin");
    setShowContract(true);
  };

  const removeContract = async (inq, contractId) => {
    try {
      setSavingFlag(inq.id, true);
      const list = Array.isArray(inq.contracts) ? inq.contracts : [];
      const next = list.filter((c) => c.id !== contractId);
      await updateDoc(doc(db, "inquiries", inq.id), { contracts: next });
    } catch (e) {
      console.error("Remove contract failed:", e);
    } finally {
      setSavingFlag(inq.id, false);
    }
  };

  const setSavingFlag = (id, v) =>
    setSaving((s) => ({ ...s, [id]: Boolean(v) }));

  const setAddingField = (id, key, val) =>
    setAdding((s) => ({ ...s, [id]: { ...(s[id] || {}), [key]: val } }));

  const setItemDraftField = (inqId, idx, key, value) =>
    setItemDrafts((d) => ({
      ...d,
      [inqId]: {
        ...(d[inqId] || {}),
        [idx]: { ...(d[inqId]?.[idx] || {}), [key]: value },
      },
    }));

  const handlePickCatalog = (inqId, rentalId) => {
    if (rentalId === "__custom__") {
      setAdding((s) => ({
        ...s,
        [inqId]: {
          ...(s[inqId] || {}),
          pickId: "__custom__",
          name: "",
          description: "",
          price: "",
          quantity: s[inqId]?.quantity || 1,
        },
      }));
      return;
    }
    const picked = catalog.find((r) => r.id === rentalId);
    if (!picked) return;
    setAdding((s) => ({
      ...s,
      [inqId]: {
        ...(s[inqId] || {}),
        pickId: rentalId,
        name: picked.name || "",
        description: picked.description || "",
        price: picked.price != null ? String(picked.price) : "",
        quantity: s[inqId]?.quantity || 1,
      },
    }));
  };

  // totals math
  const calcTotals = (inq) => {
    const items = Array.isArray(inq.items) ? inq.items : [];
    const subtotal = items.reduce(
      (sum, it) =>
        sum + Number(it.price || 0) * Math.max(0, Number(it.quantity || 0)),
      0
    );
    const dType =
      inq.discountType === "percent" || inq.discountType === "amount"
        ? inq.discountType
        : "amount";
    const dRaw =
      inq.discountType === "percent"
        ? Number(inq.discountValue || 0)
        : inq.discount != null
        ? Number(inq.discount || 0)
        : Number(inq.discountValue || 0) || 0;
    const discountApplied =
      dType === "percent"
        ? Math.max(0, Math.min(100, dRaw)) * 0.01 * subtotal
        : Math.max(0, dRaw);
    const baseAfterDiscount = Math.max(0, subtotal - discountApplied);
    const fType =
      inq.feeType === "percent" || inq.feeType === "amount"
        ? inq.feeType
        : "amount";
    const fRaw = Number(inq.feeValue || 0);
    const feeApplied =
      fType === "percent"
        ? Math.max(0, Math.min(100, fRaw)) * 0.01 * baseAfterDiscount
        : Math.max(0, fRaw);
    const travel = Math.max(0, Number(inq.travelAmount || 0));
    const taxPercent = Math.max(0, Math.min(100, Number(inq.taxPercent || 0)));
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

  // deposits helpers
  const sumDeposits = (inq) =>
    (Array.isArray(inq?.deposits) ? inq.deposits : []).reduce(
      (s, d) => s + Number(d?.amount || 0),
      0
    );

  const setDepositField = (inqId, key, val) =>
    setDepositDraft((s) => ({
      ...s,
      [inqId]: { ...(s[inqId] || {}), [key]: val },
    }));

  const addDeposit = async (inq) => {
    const draft = depositDraft[inq.id] || {};
    const amt = Number(draft.amount || 0);
    if (amt <= 0) return;
    const next = [
      ...(Array.isArray(inq.deposits) ? inq.deposits : []),
      {
        id: crypto.randomUUID?.() || String(Date.now()),
        amount: amt,
        note: String(draft.note || ""),
        date: new Date().toISOString(),
        addedBy: "admin",
      },
    ];
    try {
      setSavingFlag(inq.id, true);
      await updateDoc(doc(db, "inquiries", inq.id), { deposits: next });
      setDepositDraft((s) => ({ ...s, [inq.id]: { amount: "", note: "" } }));
    } catch (e) {
      console.error("Add deposit failed:", e);
    } finally {
      setSavingFlag(inq.id, false);
    }
  };

  const removeDeposit = async (inq, depId) => {
    const list = Array.isArray(inq.deposits) ? inq.deposits : [];
    const next = list.filter((d) => d.id !== depId);
    try {
      setSavingFlag(inq.id, true);
      await updateDoc(doc(db, "inquiries", inq.id), { deposits: next });
    } catch (e) {
      console.error("Remove deposit failed:", e);
    } finally {
      setSavingFlag(inq.id, false);
    }
  };

  // saves
  const saveStatus = async (inq, nextStatus) => {
    try {
      setSavingFlag(inq.id, true);
      await updateDoc(doc(db, "inquiries", inq.id), { status: nextStatus });
    } catch (e) {
      console.error("Status update failed:", e);
    } finally {
      setSavingFlag(inq.id, false);
    }
  };

  const deleteInquiry = async (inq) => {
    const ok = window.confirm(
      "Delete this inquiry permanently? This cannot be undone."
    );
    if (!ok) return;
    try {
      setSavingFlag(inq.id, true);
      await deleteDoc(doc(db, "inquiries", inq.id));
    } catch (e) {
      console.error("Delete failed:", e);
      setSavingFlag(inq.id, false);
    }
  };

  const saveDiscount = async (inq) => {
    try {
      setSavingFlag(inq.id, true);
      const draft = discountDraft[inq.id] || { type: "amount", value: 0 };
      const type =
        draft.type === "percent" || draft.type === "amount"
          ? draft.type
          : "amount";
      const valueNum = Number(draft.value || 0);
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
      await updateDoc(doc(db, "inquiries", inq.id), payload);
    } catch (e) {
      console.error("Discount update failed:", e);
    } finally {
      setSavingFlag(inq.id, false);
    }
  };

  const saveTax = async (inq) => {
    try {
      setSavingFlag(inq.id, true);
      const pct = Math.max(0, Math.min(100, Number(taxDraft[inq.id] || 0)));
      await updateDoc(doc(db, "inquiries", inq.id), { taxPercent: pct });
    } catch (e) {
      console.error("Tax update failed:", e);
    } finally {
      setSavingFlag(inq.id, false);
    }
  };

  const saveTravel = async (inq) => {
    try {
      setSavingFlag(inq.id, true);
      const amt = Math.max(0, Number(travelDraft[inq.id] || 0));
      await updateDoc(doc(db, "inquiries", inq.id), { travelAmount: amt });
    } catch (e) {
      console.error("Travel update failed:", e);
    } finally {
      setSavingFlag(inq.id, false);
    }
  };

  const saveFee = async (inq) => {
    try {
      setSavingFlag(inq.id, true);
      const draft = feeDraft[inq.id] || { type: "amount", value: 0 };
      const type =
        draft.type === "percent" || draft.type === "amount"
          ? draft.type
          : "amount";
      const valueNum = Number(draft.value || 0);
      const payload =
        type === "percent"
          ? {
              feeType: "percent",
              feeValue: Math.max(0, Math.min(100, valueNum)),
            }
          : { feeType: "amount", feeValue: Math.max(0, valueNum) };
      await updateDoc(doc(db, "inquiries", inq.id), payload);
    } catch (e) {
      console.error("Fee update failed:", e);
    } finally {
      setSavingFlag(inq.id, false);
    }
  };

  const saveItems = async (inq, nextItems) => {
    try {
      setSavingFlag(inq.id, true);
      const clean = nextItems.map((it) => ({
        id: it.id,
        name: it.name,
        description: it.description || "",
        price: Number(it.price || 0),
        quantity: Math.max(0, Number(it.quantity || 0)),
        media: Array.isArray(it.media) ? it.media : [],
      }));
      await updateDoc(doc(db, "inquiries", inq.id), { items: clean });
    } catch (e) {
      console.error("Items update failed:", e);
    } finally {
      setSavingFlag(inq.id, false);
    }
  };

  const submitItemRow = async (inq, idx) => {
    const draft = itemDrafts[inq.id]?.[idx];
    const items = [...(inq.items || [])];
    const next = { ...items[idx] };
    next.price = Number(draft?.price || 0);
    next.quantity = Math.max(0, Number(draft?.quantity || 0));
    items[idx] = next;
    await saveItems(inq, items);
  };

  const removeItem = async (inq, index) => {
    const items = [...(inq.items || [])].filter((_, i) => i !== index);
    await saveItems(inq, items);
    setItemDrafts((d) => {
      const copy = { ...(d[inq.id] || {}) };
      delete copy[index];
      return { ...d, [inq.id]: copy };
    });
  };

  const addItem = async (inq) => {
    const draft = adding[inq.id] || {};
    if (!draft.name) return;

    let media = [];
    const pickId = draft.pickId || "";

    if (pickId && pickId !== "__custom__") {
      const picked = catalog.find((r) => r.id === pickId);
      media = Array.isArray(picked?.media) ? picked.media : [];
    }

    const item = {
      id: draft.id || crypto.randomUUID?.() || String(Date.now()),
      name: draft.name,
      description: draft.description || "",
      price: Number(draft.price || 0),
      quantity: Math.max(1, Number(draft.quantity || 1)),
      media,
    };

    const items = [...(inq.items || []), item];
    await saveItems(inq, items);
    setAdding((s) => ({ ...s, [inq.id]: {} }));
  };

  const saveEvents = async (inq, rows) => {
    try {
      setSavingFlag(inq.id, true);
      await updateDoc(doc(db, "inquiries", inq.id), { events: rows });
    } catch (e) {
      console.error("Events update failed:", e);
    } finally {
      setSavingFlag(inq.id, false);
    }
  };

  const list = useMemo(
    () =>
      inquiries.slice().sort((a, b) => {
        const ta = a?.timestamp?.toDate ? a.timestamp.toDate().getTime() : 0;
        const tb = b?.timestamp?.toDate ? b.timestamp.toDate().getTime() : 0;
        return tb - ta;
      }),
    [inquiries]
  );

  // compact accordion requirement and Completed section
  const activeList = useMemo(
    () => list.filter((inq) => (inq.status || "Processing") !== "Completed"),
    [list]
  );
  const completedList = useMemo(
    () => list.filter((inq) => (inq.status || "Processing") === "Completed"),
    [list]
  );

  const toggleExpanded = (id) => setExpanded((m) => ({ ...m, [id]: !m[id] }));

  const filteredUsers = useMemo(() => {
    const q = String(userSearch || "")
      .trim()
      .toLowerCase();
    if (!q) return [];
    return users
      .filter((u) => {
        const name = String(u?.name || "").toLowerCase();
        const email = String(u?.email || "").toLowerCase();
        const phone = String(u?.phoneNumber || "").toLowerCase();
        return name.includes(q) || email.includes(q) || phone.includes(q);
      })
      .slice(0, 8);
  }, [userSearch, users]);

  const filteredAssignUsers = useMemo(() => {
    const q = String(assignUserSearch || "")
      .trim()
      .toLowerCase();
    if (!q) return [];
    return users
      .filter((u) => {
        const name = String(u?.name || "").toLowerCase();
        const email = String(u?.email || "").toLowerCase();
        const phone = String(u?.phoneNumber || "").toLowerCase();
        return name.includes(q) || email.includes(q) || phone.includes(q);
      })
      .slice(0, 8);
  }, [assignUserSearch, users]);

  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center py-5">
        <Spinner animation="border" />
      </div>
    );
  }
  const openNewInquiry = () => {
    setNewInquiryDraft({
      name: "",
      email: "",
      phoneNumber: "",
      eventDetails: "",
      status: "Processing",
    });
    setUserSearch("");
    setSelectedUser(null);
    setShowNewInquiry(true);
  };

  const createManualInquiry = async () => {
    const payload = {
      name: String(newInquiryDraft.name || "").trim(),
      email: String(newInquiryDraft.email || "").trim(),
      phoneNumber: String(newInquiryDraft.phoneNumber || "").trim(),
      eventDetails: String(newInquiryDraft.eventDetails || "").trim(),
      status: newInquiryDraft.status || "Processing",
      timestamp: serverTimestamp(),
      // keep schema consistent with the rest of your UI
      items: [],
      deposits: [],
      contracts: [],
      events: [],
      source: "manual", // optional flag so you can tell it was added by admin
    };

    // If a user is selected, assign it. If not, leave it blank.
    if (selectedUser?.id) {
      payload.userId = selectedUser.id;
    }

    // Optional: store a little denormalized info for convenience (safe even if user later changes profile)
    if (selectedUser?.email) payload.userEmail = String(selectedUser.email);
    if (selectedUser?.name) payload.userName = String(selectedUser.name);

    try {
      setCreatingInquiry(true);
      await addDoc(collection(db, "inquiries"), payload);
      setShowNewInquiry(false);
    } catch (e) {
      console.error("Create inquiry failed:", e);
      alert("Failed to create inquiry. Check console for details.");
    } finally {
      setCreatingInquiry(false);
    }
  };

  const openAssignUserModal = (inq) => {
    setAssigningInquiry(inq);

    // If inquiry already has a userId, preselect that user if we have it in users[]
    const existing = inq?.userId
      ? users.find((u) => u.id === inq.userId)
      : null;

    setAssignSelectedUser(
      existing
        ? { id: existing.id, name: existing.name, email: existing.email }
        : null
    );

    setAssignUserSearch("");
    setShowAssignUser(true);
  };

  const saveUserAssignment = async () => {
    if (!assigningInquiry?.id) return;

    try {
      setSavingUserAssign(true);

      const ref = doc(db, "inquiries", assigningInquiry.id);

      // If none selected, clear the user fields
      if (!assignSelectedUser?.id) {
        await updateDoc(ref, {
          userId: "",
          userName: "",
          userEmail: "",
        });
        setShowAssignUser(false);
        return;
      }

      // Save assignment
      await updateDoc(ref, {
        userId: assignSelectedUser.id,
        userName: assignSelectedUser.name || "",
        userEmail: assignSelectedUser.email || "",
      });

      setShowAssignUser(false);
    } catch (e) {
      console.error("User assignment failed:", e);
      alert("Failed to update user assignment. Check console for details.");
    } finally {
      setSavingUserAssign(false);
    }
  };

  const clearUserAssignment = async () => {
    setAssignSelectedUser(null);
    setAssignUserSearch("");
  };

  return (
    <Container className="py-3">
      <style>{`
        .nowrap { white-space: nowrap; }
        .thumb { width: 56px; height: 32px; object-fit: cover; border-radius: .375rem; }
        @media (max-width: 576px) { .stack-on-xs { display: grid; gap: .5rem; } }
      `}</style>

      {/* Inquiries, compact accordion cards */}
      <div className="d-flex align-items-center justify-content-between mb-2">
        <h4 className="mb-0">Inquiries</h4>
        <Button size="sm" onClick={openNewInquiry}>
          Add inquiry
        </Button>
      </div>

      <Row xs={1} sm={1} md={1} lg={2} xl={3} className="g-3">
        {activeList.map((inq) => {
          const {
            subtotal,
            discountApplied,
            baseAfterDiscount,
            feeApplied,
            travel,
            taxApplied,
            total,
          } = calcTotals(inq);

          const dateStr = getHeaderDateLines(inq);

          const busy = Boolean(saving[inq.id]);
          const depTotal = sumDeposits(inq);
          const remaining = Math.max(0, total - depTotal);
          const add = adding[inq.id] || {};

          return (
            <Col key={inq.id}>
              <Card className="shadow-sm h-100 border-0">
                {/* Compact header with only name, date, total, status */}
                <Card.Header
                  role="button"
                  onClick={() => toggleExpanded(inq.id)}
                  className="d-flex justify-content-between align-items-center"
                >
                  <div>
                    <div className="fw-semibold">{inq.name || "Unknown"}</div>
                    <div className="small text-muted">{dateStr}</div>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <Badge bg="light" text="dark">
                      {money(total)}
                    </Badge>
                    <Badge bg="secondary">{inq.status || "Processing"}</Badge>
                  </div>
                </Card.Header>

                {/* Expanded content */}
                {expanded[inq.id] ? (
                  <Card.Body
                    className="position-relative"
                    style={{ overflow: "visible" }}
                  >
                    {/* Row of actions on top */}
                    <div className="d-flex align-items-center justify-content-end gap-2 mb-2">
                      <Button
                        size="sm"
                        variant="outline-primary"
                        onClick={() => openAssignUserModal(inq)}
                      >
                        Assign user
                      </Button>

                      <Button
                        size="sm"
                        variant="outline-danger"
                        onClick={() => deleteInquiry(inq)}
                        disabled={busy}
                      >
                        Delete
                      </Button>
                    </div>

                    {/* Status */}
                    <Form.Group className="mt-1 mb-3">
                      <Form.Label className="fw-semibold">Status</Form.Label>
                      <Form.Select
                        value={inq.status || "Processing"}
                        onChange={(e) => saveStatus(inq, e.target.value)}
                        disabled={busy}
                      >
                        {statusOptions.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>

                    {/* Contact and schedule view */}
                    <ContactBlock inq={inq} />
                    <EventSchedule inq={inq} />

                    {/* Admin schedule editor */}
                    <EventScheduleEditor
                      inq={inq}
                      busy={busy}
                      onSave={(rows) => saveEvents(inq, rows)}
                    />

                    {/* Deposits section, not used in contracts or totals */}
                    <div className="mt-4">
                      <div className="d-flex justify-content-between align-items-center">
                        <div className="fw-semibold">Deposits</div>
                      </div>
                      <div className="small text-muted">
                        Not included in contracts or totals
                      </div>

                      {(Array.isArray(inq.deposits) ? inq.deposits : [])
                        .length === 0 ? (
                        <div className="text-muted small mt-1">
                          No deposits yet
                        </div>
                      ) : (
                        <ul className="list-unstyled mt-2">
                          {inq.deposits.map((d) => (
                            <li
                              key={d.id}
                              className="d-flex justify-content-between align-items-center py-1"
                            >
                              <div>
                                <span className="fw-semibold">
                                  {money(Number(d.amount || 0))}
                                </span>
                                {d.note ? (
                                  <span className="text-muted small">
                                    , {d.note}
                                  </span>
                                ) : null}
                                {d.date ? (
                                  <span className="text-muted small">
                                    , {prettyDateTimeMMDDYY(d.date)}
                                  </span>
                                ) : null}
                              </div>
                              <Button
                                size="sm"
                                variant="outline-danger"
                                onClick={() => removeDeposit(inq, d.id)}
                                disabled={busy}
                              >
                                Remove
                              </Button>
                            </li>
                          ))}
                        </ul>
                      )}

                      <Row className="g-2 mt-1">
                        <Col xs={6} md={3}>
                          <InputGroup>
                            <InputGroup.Text>$</InputGroup.Text>
                            <Form.Control
                              placeholder="0.00"
                              inputMode="decimal"
                              value={depositDraft[inq.id]?.amount || ""}
                              onChange={(e) =>
                                setDepositField(
                                  inq.id,
                                  "amount",
                                  e.target.value
                                )
                              }
                              disabled={busy}
                            />
                          </InputGroup>
                        </Col>
                        <Col xs={6} md={5}>
                          <Form.Control
                            placeholder="Note, optional"
                            value={depositDraft[inq.id]?.note || ""}
                            onChange={(e) =>
                              setDepositField(inq.id, "note", e.target.value)
                            }
                            disabled={busy}
                          />
                        </Col>
                        <Col xs={12} md="auto">
                          <Button
                            size="sm"
                            onClick={() => addDeposit(inq)}
                            disabled={busy}
                          >
                            Add deposit
                          </Button>
                        </Col>
                      </Row>

                      <div className="mt-2">
                        <div className="d-flex justify-content-between">
                          <span>Total deposits</span>
                          <span>{money(depTotal)}</span>
                        </div>
                        <div className="d-flex justify-content-between fw-semibold">
                          <span>Balance after deposits</span>
                          <span>{money(remaining)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Contracts */}
                    <div className="mt-4">
                      <div className="d-flex justify-content-between align-items-center">
                        <div className="fw-semibold">Contracts</div>
                        <Button
                          size="sm"
                          variant="outline-primary"
                          onClick={() => openAddContract(inq)}
                        >
                          Add contract
                        </Button>
                      </div>

                      <div className="mt-2">
                        {(inq.contracts || []).length === 0 ? (
                          <div className="text-muted small">
                            No contracts yet
                          </div>
                        ) : (
                          <ul
                            className="list-unstyled mb-0"
                            style={{ overflow: "visible" }}
                          >
                            {inq.contracts.map((c) => (
                              <li
                                key={c.id}
                                className="d-flex align-items-center justify-content-between flex-wrap gap-2 py-1"
                              >
                                <div className="d-flex align-items-center flex-wrap gap-2">
                                  <span className="fw-semibold">{c.title}</span>
                                  {c.clientSignature ? (
                                    <Badge bg="success">Client signed</Badge>
                                  ) : (
                                    <Badge bg="warning" text="dark">
                                      Client pending
                                    </Badge>
                                  )}
                                  {c.adminSignature ? (
                                    <Badge bg="success">Admin signed</Badge>
                                  ) : (
                                    <Badge bg="warning" text="dark">
                                      Admin pending
                                    </Badge>
                                  )}
                                </div>

                                <div className="d-flex gap-2 flex-shrink-0">
                                  <Button
                                    size="sm"
                                    variant="outline-secondary"
                                    onClick={() =>
                                      openViewContractAdmin(inq, c, false)
                                    }
                                  >
                                    View
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      openViewContractAdmin(inq, c, true)
                                    }
                                  >
                                    Sign as admin
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline-danger"
                                    onClick={() => removeContract(inq, c.id)}
                                  >
                                    Remove
                                  </Button>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>

                    {/* Mobile collapsible, desktop expanded, items and charges remain unchanged */}
                    <div className="d-md-none">
                      <Accordion alwaysOpen className="mt-3">
                        <Accordion.Item eventKey="items">
                          <Accordion.Header>Items</Accordion.Header>
                          <Accordion.Body className="pt-3">
                            {(inq.items || []).map((item, idx) => {
                              const draft = itemDrafts[inq.id]?.[idx] || {};
                              const media = Array.isArray(item.media)
                                ? item.media
                                : [];
                              const cover = media[0];
                              const lineTotal =
                                Number(draft.price ?? item.price ?? 0) *
                                Number(draft.quantity ?? item.quantity ?? 0);

                              return (
                                <div
                                  key={`${inq.id}-${item.id || idx}`}
                                  className="mb-3"
                                >
                                  <div className="d-flex align-items-center gap-2">
                                    {cover && cover.type !== "video" ? (
                                      <Image
                                        src={cover.url}
                                        alt="thumb"
                                        className="thumb"
                                      />
                                    ) : (
                                      <div
                                        className="thumb d-flex align-items-center justify-content-center bg-light text-muted"
                                        style={{ fontSize: 10 }}
                                      >
                                        {cover ? "video" : "no media"}
                                      </div>
                                    )}
                                    <div className="fw-semibold">
                                      {item.name}
                                    </div>
                                    <Badge bg="light" text="dark">
                                      {money(item.price)} x {item.quantity}
                                    </Badge>
                                  </div>

                                  {item.description ? (
                                    <div className="text-muted small mt-1">
                                      {item.description}
                                    </div>
                                  ) : null}

                                  <Row className="g-2 mt-2">
                                    <Col xs={6}>
                                      <Form.Label className="mb-0 small">
                                        Price
                                      </Form.Label>
                                      <InputGroup>
                                        <InputGroup.Text>$</InputGroup.Text>
                                        <Form.Control
                                          type="text"
                                          inputMode="decimal"
                                          placeholder="0.00"
                                          value={
                                            draft.price ?? item.price ?? ""
                                          }
                                          onChange={(e) =>
                                            setItemDraftField(
                                              inq.id,
                                              idx,
                                              "price",
                                              e.target.value
                                            )
                                          }
                                          disabled={busy}
                                        />
                                      </InputGroup>
                                    </Col>
                                    <Col xs={6}>
                                      <Form.Label className="mb-0 small">
                                        Quantity
                                      </Form.Label>
                                      <Form.Control
                                        type="text"
                                        inputMode="numeric"
                                        placeholder="0"
                                        value={
                                          draft.quantity ?? item.quantity ?? ""
                                        }
                                        onChange={(e) =>
                                          setItemDraftField(
                                            inq.id,
                                            idx,
                                            "quantity",
                                            e.target.value
                                          )
                                        }
                                        disabled={busy}
                                      />
                                    </Col>
                                    <Col xs={12} className="d-flex gap-2 mt-1">
                                      <div className="ms-auto small text-muted">
                                        Line total: {money(lineTotal)}
                                      </div>
                                    </Col>
                                    <Col
                                      xs={12}
                                      className="stack-on-xs d-flex gap-2"
                                    >
                                      <Button
                                        size="sm"
                                        className="text-nowrap"
                                        onClick={() => submitItemRow(inq, idx)}
                                        disabled={busy}
                                      >
                                        Update
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline-danger"
                                        className="text-nowrap"
                                        onClick={() => removeItem(inq, idx)}
                                        disabled={busy}
                                      >
                                        Remove
                                      </Button>
                                    </Col>
                                  </Row>
                                </div>
                              );
                            })}

                            {/* Add item, with catalog picker */}
                            <div className="mt-2">
                              <div className="fw-semibold mb-1">Add item</div>
                              <Form.Group className="mb-2">
                                <Form.Label className="mb-1">
                                  Pick from catalog
                                </Form.Label>
                                <Form.Select
                                  value={adding[inq.id]?.pickId || ""}
                                  onChange={(e) =>
                                    handlePickCatalog(inq.id, e.target.value)
                                  }
                                  disabled={busy}
                                >
                                  <option value="">Choose an item</option>
                                  {catalog.map((r) => (
                                    <option key={r.id} value={r.id}>
                                      {r.name}
                                      {r.price != null
                                        ? `, ${money(r.price)}`
                                        : ""}
                                    </option>
                                  ))}
                                  <option value="__custom__">
                                    Custom item
                                  </option>
                                </Form.Select>
                              </Form.Group>

                              <Row className="g-2">
                                <Col xs={12}>
                                  <Form.Control
                                    placeholder="Name"
                                    value={adding[inq.id]?.name || ""}
                                    onChange={(e) =>
                                      setAddingField(
                                        inq.id,
                                        "name",
                                        e.target.value
                                      )
                                    }
                                    disabled={busy}
                                  />
                                </Col>
                                <Col xs={12}>
                                  <Form.Control
                                    placeholder="Description"
                                    value={adding[inq.id]?.description || ""}
                                    onChange={(e) =>
                                      setAddingField(
                                        inq.id,
                                        "description",
                                        e.target.value
                                      )
                                    }
                                    disabled={busy}
                                  />
                                </Col>
                                <Col xs={6}>
                                  <InputGroup>
                                    <InputGroup.Text>$</InputGroup.Text>
                                    <Form.Control
                                      type="text"
                                      inputMode="decimal"
                                      placeholder="Price"
                                      value={adding[inq.id]?.price || ""}
                                      onChange={(e) =>
                                        setAddingField(
                                          inq.id,
                                          "price",
                                          e.target.value
                                        )
                                      }
                                      disabled={busy}
                                    />
                                  </InputGroup>
                                </Col>
                                <Col xs={6}>
                                  <Form.Control
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="Qty"
                                    value={adding[inq.id]?.quantity || ""}
                                    onChange={(e) =>
                                      setAddingField(
                                        inq.id,
                                        "quantity",
                                        e.target.value
                                      )
                                    }
                                    disabled={busy}
                                  />
                                </Col>
                                <Col xs={12}>
                                  <Button
                                    className="w-100"
                                    onClick={() => addItem(inq)}
                                    disabled={busy || !adding[inq.id]?.name}
                                  >
                                    Add
                                  </Button>
                                </Col>
                              </Row>
                            </div>
                          </Accordion.Body>
                        </Accordion.Item>

                        {/* Charges mobile */}
                        <Accordion.Item eventKey="charges">
                          <Accordion.Header>Charges</Accordion.Header>
                          <Accordion.Body className="pt-3">
                            {/* Discount */}
                            <Row className="g-2">
                              <Col xs={12} sm={6}>
                                <Form.Label className="fw-semibold mb-1">
                                  Discount type
                                </Form.Label>
                                <Form.Select
                                  value={
                                    discountDraft[inq.id]?.type || "amount"
                                  }
                                  onChange={(e) =>
                                    setDiscountDraft((s) => ({
                                      ...s,
                                      [inq.id]: {
                                        ...(s[inq.id] || {}),
                                        type: e.target.value,
                                      },
                                    }))
                                  }
                                  disabled={busy}
                                >
                                  <option value="amount">Amount, $</option>
                                  <option value="percent">Percent, %</option>
                                </Form.Select>
                              </Col>
                              <Col xs={12} sm={4}>
                                <Form.Label className="fw-semibold mb-1">
                                  Value
                                </Form.Label>
                                <Form.Control
                                  type="text"
                                  inputMode="decimal"
                                  placeholder="0"
                                  value={discountDraft[inq.id]?.value ?? ""}
                                  onChange={(e) =>
                                    setDiscountDraft((s) => ({
                                      ...s,
                                      [inq.id]: {
                                        ...(s[inq.id] || {}),
                                        value: e.target.value,
                                      },
                                    }))
                                  }
                                  disabled={busy}
                                />
                              </Col>
                              <Col xs={12} sm={2} className="stack-on-xs">
                                <Button
                                  size="sm"
                                  className="w-100 text-nowrap"
                                  onClick={() => saveDiscount(inq)}
                                  disabled={busy}
                                >
                                  Save
                                </Button>
                              </Col>
                            </Row>

                            {/* Taxes and travel */}
                            <Row className="g-2 mt-2">
                              <Col xs={12} sm={5}>
                                <Form.Label className="fw-semibold mb-1">
                                  Tax percent
                                </Form.Label>
                                <InputGroup>
                                  <Form.Control
                                    type="text"
                                    inputMode="decimal"
                                    placeholder="0"
                                    value={taxDraft[inq.id] ?? ""}
                                    onChange={(e) =>
                                      setTaxDraft((s) => ({
                                        ...s,
                                        [inq.id]: e.target.value,
                                      }))
                                    }
                                    disabled={busy}
                                  />
                                  <InputGroup.Text>%</InputGroup.Text>
                                </InputGroup>
                              </Col>
                              <Col xs={12} sm={2} className="stack-on-xs">
                                <Button
                                  size="sm"
                                  className="w-100 text-nowrap"
                                  onClick={() => saveTax(inq)}
                                  disabled={busy}
                                >
                                  Save
                                </Button>
                              </Col>

                              <Col xs={12} sm={5}>
                                <Form.Label className="fw-semibold mb-1">
                                  Travel amount
                                </Form.Label>
                                <InputGroup>
                                  <InputGroup.Text>$</InputGroup.Text>
                                  <Form.Control
                                    type="text"
                                    inputMode="decimal"
                                    placeholder="0"
                                    value={travelDraft[inq.id] ?? ""}
                                    onChange={(e) =>
                                      setTravelDraft((s) => ({
                                        ...s,
                                        [inq.id]: e.target.value,
                                      }))
                                    }
                                    disabled={busy}
                                  />
                                </InputGroup>
                              </Col>
                              <Col xs={12} sm={2} className="stack-on-xs">
                                <Button
                                  size="sm"
                                  className="w-100 text-nowrap"
                                  onClick={() => saveTravel(inq)}
                                  disabled={busy}
                                >
                                  Save
                                </Button>
                              </Col>
                            </Row>

                            {/* Fee */}
                            <Row className="g-2 mt-2">
                              <Col xs={12} sm={6}>
                                <Form.Label className="fw-semibold mb-1">
                                  Processing fee type
                                </Form.Label>
                                <Form.Select
                                  value={feeDraft[inq.id]?.type || "amount"}
                                  onChange={(e) =>
                                    setFeeDraft((s) => ({
                                      ...s,
                                      [inq.id]: {
                                        ...(s[inq.id] || {}),
                                        type: e.target.value,
                                      },
                                    }))
                                  }
                                  disabled={busy}
                                >
                                  <option value="amount">Amount, $</option>
                                  <option value="percent">Percent, %</option>
                                </Form.Select>
                              </Col>
                              <Col xs={12} sm={4}>
                                <Form.Label className="fw-semibold mb-1">
                                  Value
                                </Form.Label>
                                <Form.Control
                                  type="text"
                                  inputMode="decimal"
                                  placeholder="0"
                                  value={feeDraft[inq.id]?.value ?? ""}
                                  onChange={(e) =>
                                    setFeeDraft((s) => ({
                                      ...s,
                                      [inq.id]: {
                                        ...(s[inq.id] || {}),
                                        value: e.target.value,
                                      },
                                    }))
                                  }
                                  disabled={busy}
                                />
                              </Col>
                              <Col xs={12} sm={2} className="stack-on-xs">
                                <Button
                                  size="sm"
                                  className="w-100 text-nowrap"
                                  onClick={() => saveFee(inq)}
                                  disabled={busy}
                                >
                                  Save
                                </Button>
                              </Col>
                            </Row>

                            {/* Totals */}
                            <div className="mt-3 border-top pt-2">
                              <div className="d-flex justify-content-between">
                                <span>Subtotal</span>
                                <span>{money(subtotal)}</span>
                              </div>
                              {discountApplied > 0 && (
                                <div className="d-flex justify-content-between">
                                  <span>Discount</span>
                                  <span>{money(discountApplied)}</span>
                                </div>
                              )}
                              {feeApplied > 0 && (
                                <div className="d-flex justify-content-between">
                                  <span>Processing fee</span>
                                  <span>{money(feeApplied)}</span>
                                </div>
                              )}
                              {travel > 0 && (
                                <div className="d-flex justify-content-between">
                                  <span>Travel</span>
                                  <span>{money(travel)}</span>
                                </div>
                              )}

                              {taxApplied > 0 && (
                                <div className="d-flex justify-content-between">
                                  <span>Tax</span>
                                  <span>{money(taxApplied)}</span>
                                </div>
                              )}
                              <div className="d-flex justify-content-between fw-semibold mt-1">
                                <span>Total</span>
                                <span>{money(total)}</span>
                              </div>
                            </div>
                          </Accordion.Body>
                        </Accordion.Item>
                      </Accordion>
                    </div>

                    {/* Desktop items and charges */}
                    <div className="d-none d-md-block">
                      <div className="line my-3"></div>
                      <div className="fw-semibold mb-2">Items</div>

                      {(inq.items || []).map((item, idx) => {
                        const draft = itemDrafts[inq.id]?.[idx] || {};
                        const media = Array.isArray(item.media)
                          ? item.media
                          : [];
                        const cover = media[0];
                        const lineTotal =
                          Number(draft.price ?? item.price ?? 0) *
                          Number(draft.quantity ?? item.quantity ?? 0);

                        return (
                          <div
                            key={`${inq.id}-${item.id || idx}`}
                            className="mb-3"
                          >
                            <div className="d-flex align-items-center gap-2 mb-1">
                              {cover && cover.type !== "video" ? (
                                <Image
                                  src={cover.url}
                                  alt="thumb"
                                  className="thumb"
                                />
                              ) : (
                                <div
                                  className="thumb d-flex align-items-center justify-content-center bg-light text-muted"
                                  style={{ fontSize: 10 }}
                                >
                                  {cover ? "video" : "no media"}
                                </div>
                              )}
                              <div className="fw-semibold">{item.name}</div>
                              <Badge bg="light" text="dark">
                                {money(item.price)} x {item.quantity}
                              </Badge>
                              <div className="ms-auto small text-muted">
                                Line total: {money(lineTotal)}
                              </div>
                            </div>

                            {item.description ? (
                              <div className="text-muted small mb-2">
                                {item.description}
                              </div>
                            ) : null}

                            <Row className="g-2 align-items-end">
                              <Col lg={5}>
                                <Form.Label className="mb-0 small">
                                  Price
                                </Form.Label>
                                <InputGroup>
                                  <InputGroup.Text>$</InputGroup.Text>
                                  <Form.Control
                                    type="text"
                                    inputMode="decimal"
                                    placeholder="0.00"
                                    value={draft.price ?? item.price ?? ""}
                                    onChange={(e) =>
                                      setItemDraftField(
                                        inq.id,
                                        idx,
                                        "price",
                                        e.target.value
                                      )
                                    }
                                    disabled={busy}
                                  />
                                </InputGroup>
                              </Col>
                              <Col lg={3}>
                                <Form.Label className="mb-0 small">
                                  Quantity
                                </Form.Label>
                                <Form.Control
                                  type="text"
                                  inputMode="numeric"
                                  placeholder="0"
                                  value={draft.quantity ?? item.quantity ?? ""}
                                  onChange={(e) =>
                                    setItemDraftField(
                                      inq.id,
                                      idx,
                                      "quantity",
                                      e.target.value
                                    )
                                  }
                                  disabled={busy}
                                />
                              </Col>
                              <Col
                                lg={4}
                                className="d-flex gap-2 justify-content-end"
                              >
                                <Button
                                  size="sm"
                                  className="text-nowrap"
                                  onClick={() => submitItemRow(inq, idx)}
                                  disabled={busy}
                                >
                                  Update
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline-danger"
                                  className="text-nowrap"
                                  onClick={() => removeItem(inq, idx)}
                                  disabled={busy}
                                >
                                  Remove
                                </Button>
                              </Col>
                            </Row>
                          </div>
                        );
                      })}

                      {/* Add item with catalog picker */}
                      <div className="mt-3">
                        <div className="fw-semibold mb-1">Add item</div>
                        <Row className="g-2 align-items-end">
                          <Col lg={6}>
                            <Form.Label className="mb-1">
                              Pick from catalog
                            </Form.Label>
                            <Form.Select
                              value={adding[inq.id]?.pickId || ""}
                              onChange={(e) =>
                                handlePickCatalog(inq.id, e.target.value)
                              }
                              disabled={busy}
                            >
                              <option value="">Choose an item</option>
                              {catalog.map((r) => (
                                <option key={r.id} value={r.id}>
                                  {r.name}
                                  {r.price != null ? `, ${money(r.price)}` : ""}
                                </option>
                              ))}
                              <option value="__custom__">Custom item</option>
                            </Form.Select>
                          </Col>

                          <Col lg={6}>
                            <Form.Label className="mb-1">Name</Form.Label>
                            <Form.Control
                              placeholder="Name"
                              value={adding[inq.id]?.name || ""}
                              onChange={(e) =>
                                setAddingField(inq.id, "name", e.target.value)
                              }
                              disabled={busy}
                            />
                          </Col>

                          <Col lg={6}>
                            <Form.Label className="mb-1">
                              Description
                            </Form.Label>
                            <Form.Control
                              placeholder="Description"
                              value={adding[inq.id]?.description || ""}
                              onChange={(e) =>
                                setAddingField(
                                  inq.id,
                                  "description",
                                  e.target.value
                                )
                              }
                              disabled={busy}
                            />
                          </Col>

                          <Col lg={3}>
                            <Form.Label className="mb-1">Price</Form.Label>
                            <InputGroup>
                              <InputGroup.Text>$</InputGroup.Text>
                              <Form.Control
                                type="text"
                                inputMode="decimal"
                                placeholder="0.00"
                                value={adding[inq.id]?.price || ""}
                                onChange={(e) =>
                                  setAddingField(
                                    inq.id,
                                    "price",
                                    e.target.value
                                  )
                                }
                                disabled={busy}
                              />
                            </InputGroup>
                          </Col>

                          <Col lg={2}>
                            <Form.Label className="mb-1">Qty</Form.Label>
                            <Form.Control
                              type="text"
                              inputMode="numeric"
                              placeholder="1"
                              value={adding[inq.id]?.quantity || ""}
                              onChange={(e) =>
                                setAddingField(
                                  inq.id,
                                  "quantity",
                                  e.target.value
                                )
                              }
                              disabled={busy}
                            />
                          </Col>

                          <Col lg={1} className="d-flex justify-content-end">
                            <Button
                              size="sm"
                              className="text-nowrap mt-4"
                              onClick={() => addItem(inq)}
                              disabled={busy || !adding[inq.id]?.name}
                            >
                              Add
                            </Button>
                          </Col>
                        </Row>
                      </div>

                      <div className="line my-3"></div>

                      {/* Charges desktop */}
                      <Row className="g-2 align-items-end">
                        <Col lg={4}>
                          <Form.Label className="fw-semibold mb-1">
                            Discount type
                          </Form.Label>
                          <Form.Select
                            value={discountDraft[inq.id]?.type || "amount"}
                            onChange={(e) =>
                              setDiscountDraft((s) => ({
                                ...s,
                                [inq.id]: {
                                  ...(s[inq.id] || {}),
                                  type: e.target.value,
                                },
                              }))
                            }
                            disabled={busy}
                          >
                            <option value="amount">Amount, $</option>
                            <option value="percent">Percent, %</option>
                          </Form.Select>
                        </Col>
                        <Col lg={3}>
                          <Form.Label className="fw-semibold mb-1">
                            Value
                          </Form.Label>
                          <Form.Control
                            type="text"
                            inputMode="decimal"
                            placeholder="0"
                            value={discountDraft[inq.id]?.value ?? ""}
                            onChange={(e) =>
                              setDiscountDraft((s) => ({
                                ...s,
                                [inq.id]: {
                                  ...(s[inq.id] || {}),
                                  value: e.target.value,
                                },
                              }))
                            }
                            disabled={busy}
                          />
                        </Col>
                        <Col lg={2} className="d-flex justify-content-end">
                          <Button
                            size="sm"
                            className="text-nowrap"
                            onClick={() => saveDiscount(inq)}
                            disabled={busy}
                          >
                            Save
                          </Button>
                        </Col>

                        <Col lg={3} />

                        <Col lg={4}>
                          <Form.Label className="fw-semibold mb-1">
                            Tax percent
                          </Form.Label>
                          <InputGroup>
                            <Form.Control
                              type="text"
                              inputMode="decimal"
                              placeholder="0"
                              value={taxDraft[inq.id] ?? ""}
                              onChange={(e) =>
                                setTaxDraft((s) => ({
                                  ...s,
                                  [inq.id]: e.target.value,
                                }))
                              }
                              disabled={busy}
                            />
                            <InputGroup.Text>%</InputGroup.Text>
                          </InputGroup>
                        </Col>
                        <Col lg={2} className="d-flex justify-content-end">
                          <Button
                            size="sm"
                            className="text-nowrap"
                            onClick={() => saveTax(inq)}
                            disabled={busy}
                          >
                            Save
                          </Button>
                        </Col>

                        <Col lg={4}>
                          <Form.Label className="fw-semibold mb-1">
                            Travel amount
                          </Form.Label>
                          <InputGroup>
                            <InputGroup.Text>$</InputGroup.Text>
                            <Form.Control
                              type="text"
                              inputMode="decimal"
                              placeholder="0"
                              value={travelDraft[inq.id] ?? ""}
                              onChange={(e) =>
                                setTravelDraft((s) => ({
                                  ...s,
                                  [inq.id]: e.target.value,
                                }))
                              }
                              disabled={busy}
                            />
                          </InputGroup>
                        </Col>
                        <Col lg={2} className="d-flex justify-content-end">
                          <Button
                            size="sm"
                            className="text-nowrap"
                            onClick={() => saveTravel(inq)}
                            disabled={busy}
                          >
                            Save
                          </Button>
                        </Col>

                        <Col lg={4}>
                          <Form.Label className="fw-semibold mb-1">
                            Processing fee type
                          </Form.Label>
                          <Form.Select
                            value={feeDraft[inq.id]?.type || "amount"}
                            onChange={(e) =>
                              setFeeDraft((s) => ({
                                ...s,
                                [inq.id]: {
                                  ...(s[inq.id] || {}),
                                  type: e.target.value,
                                },
                              }))
                            }
                            disabled={busy}
                          >
                            <option value="amount">Amount, $</option>
                            <option value="percent">Percent, %</option>
                          </Form.Select>
                        </Col>
                        <Col lg={3}>
                          <Form.Label className="fw-semibold mb-1">
                            Value
                          </Form.Label>
                          <Form.Control
                            type="text"
                            inputMode="decimal"
                            placeholder="0"
                            value={feeDraft[inq.id]?.value ?? ""}
                            onChange={(e) =>
                              setFeeDraft((s) => ({
                                ...s,
                                [inq.id]: {
                                  ...(s[inq.id] || {}),
                                  value: e.target.value,
                                },
                              }))
                            }
                            disabled={busy}
                          />
                        </Col>
                        <Col lg={2} className="d-flex justify-content-end">
                          <Button
                            size="sm"
                            className="text-nowrap"
                            onClick={() => saveFee(inq)}
                            disabled={busy}
                          >
                            Save
                          </Button>
                        </Col>
                      </Row>

                      {/* Totals */}
                      <div className="mt-3 text-end">
                        <div className="small text-muted">
                          Subtotal: {money(subtotal)}
                        </div>
                        {discountApplied > 0 && (
                          <div className="small text-muted">
                            Discount: {money(discountApplied)}
                          </div>
                        )}
                        {feeApplied > 0 && (
                          <div className="small text-muted">
                            Processing fee: {money(feeApplied)}
                          </div>
                        )}
                        {travel > 0 && (
                          <div className="small text-muted">
                            Travel: {money(travel)}
                          </div>
                        )}
                        <div className="small text-muted">
                          Net Total:{" "}
                          {money(baseAfterDiscount + feeApplied + travel)}
                        </div>
                        {taxApplied > 0 && (
                          <div className="small text-muted">
                            Tax: {money(taxApplied)}
                          </div>
                        )}
                        <div className="fw-semibold fs-5">
                          Total: {money(total)}
                        </div>
                      </div>
                    </div>
                  </Card.Body>
                ) : null}
              </Card>
            </Col>
          );
        })}
      </Row>

      {/* Completed section */}
      <div className="mt-4">
        <h4 className="mb-2">Completed</h4>
        <Row xs={1} sm={1} md={1} lg={2} xl={3} className="g-3">
          {completedList.map((inq) => {
            const { total } = calcTotals(inq);
            const dateStr = getHeaderDateLines(inq);

            return (
              <Col key={inq.id}>
                <Card className="shadow-sm h-100 border-0">
                  <Card.Header
                    role="button"
                    onClick={() => toggleExpanded(inq.id)}
                    className="d-flex justify-content-between align-items-center"
                  >
                    <div>
                      <div className="fw-semibold">{inq.name || "Unknown"}</div>
                      <div className="small text-muted">{dateStr}</div>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <Badge bg="light" text="dark">
                        {money(total)}
                      </Badge>
                      <Badge bg="secondary">{inq.status || "Completed"}</Badge>
                    </div>
                  </Card.Header>

                  {expanded[inq.id] ? (
                    <Card.Body>
                      {/* Admin can change status while in Completed */}
                      <Form.Group className="mb-3">
                        <Form.Label className="fw-semibold">Status</Form.Label>
                        <Form.Select
                          value={inq.status || "Completed"}
                          onChange={(e) => saveStatus(inq, e.target.value)}
                          disabled={Boolean(saving[inq.id])}
                        >
                          {statusOptions.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </Form.Select>
                      </Form.Group>

                      <ContactBlock inq={inq} />
                      <EventSchedule inq={inq} />

                      {/* Contracts, with View and Download options */}
                      <div className="mt-3">
                        <div className="fw-semibold">Contracts</div>
                        <div className="mt-2">
                          {(inq.contracts || []).length === 0 ? (
                            <div className="text-muted small">
                              No contracts yet
                            </div>
                          ) : (
                            <ul className="list-unstyled mb-0">
                              {inq.contracts.map((c) => {
                                const dlUrl =
                                  c?.downloadUrl ||
                                  c?.fileUrl ||
                                  c?.pdfUrl ||
                                  c?.url ||
                                  "";
                                return (
                                  <li
                                    key={c.id}
                                    className="d-flex align-items-center justify-content-between flex-wrap gap-2 py-1"
                                  >
                                    <div className="d-flex align-items-center flex-wrap gap-2">
                                      <span className="fw-semibold">
                                        {c.title}
                                      </span>
                                      {c.clientSignature ? (
                                        <Badge bg="success">
                                          Client signed
                                        </Badge>
                                      ) : (
                                        <Badge bg="warning" text="dark">
                                          Client pending
                                        </Badge>
                                      )}
                                      {c.adminSignature ? (
                                        <Badge bg="success">Admin signed</Badge>
                                      ) : (
                                        <Badge bg="warning" text="dark">
                                          Admin pending
                                        </Badge>
                                      )}
                                    </div>

                                    <div className="d-flex gap-2 flex-shrink-0">
                                      {/* View in Contract Modal */}
                                      <Button
                                        size="sm"
                                        variant="outline-secondary"
                                        onClick={() =>
                                          openViewContractAdmin(inq, c, false)
                                        }
                                      >
                                        View
                                      </Button>
                                    </div>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </div>
                      </div>
                    </Card.Body>
                  ) : null}
                </Card>
              </Col>
            );
          })}
        </Row>
      </div>

      <ContractModal
        show={showContract}
        onHide={() => setShowContract(false)}
        inquiry={contractInquiry}
        contract={activeContract}
        mode={contractMode}
      />
      {/* NEW: Manual inquiry modal */}
      <FormModal
        show={showNewInquiry}
        onHide={() => setShowNewInquiry(false)}
        title="Add inquiry (manual)"
      >
        <div className="mb-3">
          <div className="fw-semibold mb-1">Assign to a user (optional)</div>

          <InputGroup className="mb-2">
            <Form.Control
              placeholder="Search users by name, email, or phone"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              disabled={creatingInquiry}
            />
            {selectedUser ? (
              <Button
                variant="outline-secondary"
                onClick={() => setSelectedUser(null)}
                disabled={creatingInquiry}
              >
                Clear
              </Button>
            ) : null}
          </InputGroup>

          {selectedUser ? (
            <div className="small">
              <Badge bg="success" className="me-2">
                Selected
              </Badge>
              <span className="fw-semibold">
                {selectedUser?.name || "User"}
              </span>
              {selectedUser?.email ? (
                <span className="text-muted">, {selectedUser.email}</span>
              ) : null}
            </div>
          ) : userSearch.trim() ? (
            <div
              className="border rounded p-2"
              style={{ maxHeight: 220, overflow: "auto" }}
            >
              {filteredUsers.length === 0 ? (
                <div className="text-muted small">No matches</div>
              ) : (
                <div className="d-flex flex-column gap-2">
                  {filteredUsers.map((u) => (
                    <Button
                      key={u.id}
                      variant="outline-primary"
                      className="text-start"
                      onClick={() => {
                        setSelectedUser({
                          id: u.id,
                          name: u.name,
                          email: u.email,
                        });
                        setUserSearch("");
                      }}
                      disabled={creatingInquiry}
                    >
                      <div className="fw-semibold">
                        {u?.name || "Unnamed user"}
                      </div>
                      <div className="small text-muted">
                        {u?.email || "No email"}
                        {u?.phoneNumber ? `, ${u.phoneNumber}` : ""}
                      </div>
                    </Button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-muted small">
              Start typing to search the users collection.
            </div>
          )}
        </div>

        <Row className="g-2">
          <Col xs={12} md={6}>
            <Form.Label className="mb-1">Name</Form.Label>
            <Form.Control
              value={newInquiryDraft.name}
              onChange={(e) =>
                setNewInquiryDraft((s) => ({ ...s, name: e.target.value }))
              }
              disabled={creatingInquiry}
            />
          </Col>
          <Col xs={12} md={6}>
            <Form.Label className="mb-1">Email</Form.Label>
            <Form.Control
              value={newInquiryDraft.email}
              onChange={(e) =>
                setNewInquiryDraft((s) => ({ ...s, email: e.target.value }))
              }
              disabled={creatingInquiry}
            />
          </Col>

          <Col xs={12} md={6}>
            <Form.Label className="mb-1">Phone</Form.Label>
            <Form.Control
              value={newInquiryDraft.phoneNumber}
              onChange={(e) =>
                setNewInquiryDraft((s) => ({
                  ...s,
                  phoneNumber: e.target.value,
                }))
              }
              disabled={creatingInquiry}
            />
          </Col>

          <Col xs={12} md={6}>
            <Form.Label className="mb-1">Status</Form.Label>
            <Form.Select
              value={newInquiryDraft.status}
              onChange={(e) =>
                setNewInquiryDraft((s) => ({ ...s, status: e.target.value }))
              }
              disabled={creatingInquiry}
            >
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Form.Select>
          </Col>

          <Col xs={12}>
            <Form.Label className="mb-1">Event details</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={newInquiryDraft.eventDetails}
              onChange={(e) =>
                setNewInquiryDraft((s) => ({
                  ...s,
                  eventDetails: e.target.value,
                }))
              }
              disabled={creatingInquiry}
            />
          </Col>
        </Row>

        <div className="d-flex justify-content-end gap-2 mt-3">
          <Button
            variant="outline-secondary"
            onClick={() => setShowNewInquiry(false)}
            disabled={creatingInquiry}
          >
            Cancel
          </Button>
          <Button onClick={createManualInquiry} disabled={creatingInquiry}>
            {creatingInquiry ? "Creating..." : "Create inquiry"}
          </Button>
        </div>
      </FormModal>
      <FormModal
        show={showAssignUser}
        onHide={() => setShowAssignUser(false)}
        title="Assign inquiry to a user"
      >
        <div className="mb-2 small text-muted">
          {assigningInquiry?.name
            ? `Inquiry: ${assigningInquiry.name}`
            : "Inquiry selected"}
        </div>

        <div className="mb-3">
          <div className="fw-semibold mb-1">Search users</div>

          <InputGroup className="mb-2">
            <Form.Control
              placeholder="Search users by name, email, or phone"
              value={assignUserSearch}
              onChange={(e) => setAssignUserSearch(e.target.value)}
              disabled={savingUserAssign}
            />
            <Button
              variant="outline-secondary"
              onClick={clearUserAssignment}
              disabled={savingUserAssign}
            >
              Clear
            </Button>
          </InputGroup>

          {assignSelectedUser ? (
            <div className="small">
              <Badge bg="success" className="me-2">
                Selected
              </Badge>
              <span className="fw-semibold">
                {assignSelectedUser?.name || "User"}
              </span>
              {assignSelectedUser?.email ? (
                <span className="text-muted">, {assignSelectedUser.email}</span>
              ) : null}
            </div>
          ) : assignUserSearch.trim() ? (
            <div
              className="border rounded p-2"
              style={{ maxHeight: 220, overflow: "auto" }}
            >
              {filteredAssignUsers.length === 0 ? (
                <div className="text-muted small">No matches</div>
              ) : (
                <div className="d-flex flex-column gap-2">
                  {filteredAssignUsers.map((u) => (
                    <Button
                      key={u.id}
                      variant="outline-primary"
                      className="text-start"
                      onClick={() => {
                        setAssignSelectedUser({
                          id: u.id,
                          name: u.name,
                          email: u.email,
                        });
                        setAssignUserSearch("");
                      }}
                      disabled={savingUserAssign}
                    >
                      <div className="fw-semibold">
                        {u?.name || "Unnamed user"}
                      </div>
                      <div className="small text-muted">
                        {u?.email || "No email"}
                        {u?.phoneNumber ? `, ${u.phoneNumber}` : ""}
                      </div>
                    </Button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-muted small">
              Type to search your users collection.
            </div>
          )}
        </div>

        <div className="d-flex justify-content-end gap-2">
          <Button
            variant="outline-danger"
            onClick={async () => {
              // clear assignment immediately and save
              setAssignSelectedUser(null);
              setAssignUserSearch("");
              await saveUserAssignment();
            }}
            disabled={savingUserAssign}
          >
            Remove user
          </Button>

          <Button
            variant="outline-secondary"
            onClick={() => setShowAssignUser(false)}
            disabled={savingUserAssign}
          >
            Cancel
          </Button>

          <Button onClick={saveUserAssignment} disabled={savingUserAssign}>
            {savingUserAssign ? "Saving..." : "Save"}
          </Button>
        </div>
      </FormModal>
    </Container>
  );
}
