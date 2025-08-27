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
} from "react-bootstrap";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  doc,
} from "firebase/firestore";
import db from "../../api/firestore/firestore";

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

export default function Inquiries() {
  const [inquiries, setInquiries] = useState([]);
  const [saving, setSaving] = useState({});
  const [adding, setAdding] = useState({}); // per inquiry add form
  const [itemDrafts, setItemDrafts] = useState({}); // per row edits
  const [discountDraft, setDiscountDraft] = useState({});
  const [taxDraft, setTaxDraft] = useState({});
  const [travelDraft, setTravelDraft] = useState({});
  const [feeDraft, setFeeDraft] = useState({});

  // rentals catalog for the dropdown
  const [catalog, setCatalog] = useState([]);

  // load inquiries realtime
  useEffect(() => {
    const ref = collection(db, "inquiries");
    const q = query(ref, orderBy("timestamp", "desc"));
    const stop = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setInquiries(rows);

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
      (err) => console.error("Realtime inquiries error:", err)
    );
    return () => stop();
  }, []);

  // load rentals catalog realtime for dropdown
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

  // pick from catalog, or custom
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
        price: picked.price != null ? String(picked.price) : "", // allow admin to fill if not present
        quantity: s[inqId]?.quantity || 1,
        // keep media reference if you decide to store it later
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
    const item = {
      id: draft.id || crypto.randomUUID?.() || String(Date.now()),
      name: draft.name,
      description: draft.description || "",
      price: Number(draft.price || 0),
      quantity: Math.max(1, Number(draft.quantity || 1)),
      media: [], // optional, you can also attach picked media if you like
    };
    const items = [...(inq.items || []), item];
    await saveItems(inq, items);
    setAdding((s) => ({ ...s, [inq.id]: {} }));
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

  return (
    <Container className="py-3">
      <Row xs={1} sm={1} md={1} lg={2} xl={3} className="g-3">
        {list.map((inq) => {
          const {
            subtotal,
            discountApplied,
            feeApplied,
            travel,
            taxApplied,
            total,
          } = calcTotals(inq);
          const dateStr = inq?.timestamp?.toDate
            ? inq.timestamp.toDate().toLocaleString()
            : "N/A";
          const busy = Boolean(saving[inq.id]);
          const add = adding[inq.id] || {};

          return (
            <Col key={inq.id}>
              <Card className="shadow-sm h-100">
                <Card.Body>
                  <style>{`
                    .nowrap { white-space: nowrap; }
                    .btn-sm.text-nowrap { white-space: nowrap; }
                    @media (max-width: 576px) { .stack-on-xs { display: grid; gap: .5rem; } }
                  `}</style>

                  {/* Header */}
                  <div className="d-flex flex-column flex-sm-row justify-content-between gap-1">
                    <div>
                      <Card.Title className="mb-1">
                        {inq.name || "Unknown"}
                      </Card.Title>
                      <div className="text-muted small">
                        {inq.phoneNumber || ""}
                        {inq.email ? `, ${inq.email}` : ""}
                      </div>
                    </div>
                    <Badge bg="secondary" className="align-self-start">
                      {dateStr}
                    </Badge>
                  </div>

                  {/* Status */}
                  <Form.Group className="mt-3">
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

                  {inq.eventDetails ? (
                    <>
                      <div className="line my-3"></div>
                      <Card.Text className="text-muted">
                        {inq.eventDetails}
                      </Card.Text>
                    </>
                  ) : null}

                  {/* Mobile collapsible, desktop expanded */}
                  <div className="d-md-none">
                    <Accordion alwaysOpen className="mt-2">
                      <Accordion.Item eventKey="items">
                        <Accordion.Header>Items</Accordion.Header>
                        <Accordion.Body className="pt-3">
                          {(inq.items || []).map((item, idx) => {
                            const draft = itemDrafts[inq.id]?.[idx] || {};
                            return (
                              <div
                                key={`${inq.id}-${item.id || idx}`}
                                className="mb-3"
                              >
                                <div className="fw-semibold">{item.name}</div>
                                <div className="text-muted small mb-2">
                                  {item.description}
                                </div>
                                <Row className="g-2">
                                  <Col xs={12} sm={6}>
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
                                  <Col xs={12} sm={6}>
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
                                value={add.pickId || ""}
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
                                <option value="__custom__">Custom item</option>
                              </Form.Select>
                            </Form.Group>

                            <Row className="g-2">
                              <Col xs={12}>
                                <Form.Control
                                  placeholder="Name"
                                  value={add.name || ""}
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
                                  value={add.description || ""}
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
                                    value={add.price || ""}
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
                                  value={add.quantity || ""}
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
                                  disabled={busy || !add.name}
                                >
                                  Add
                                </Button>
                              </Col>
                            </Row>
                          </div>
                        </Accordion.Body>
                      </Accordion.Item>

                      {/* Charges mobile... unchanged from your last version */}
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

                  {/* Desktop expanded */}
                  <div className="d-none d-md-block">
                    <div className="line my-3"></div>
                    <div className="fw-semibold mb-2">Items</div>

                    {(inq.items || []).map((item, idx) => {
                      const draft = itemDrafts[inq.id]?.[idx] || {};
                      return (
                        <div
                          key={`${inq.id}-${item.id || idx}`}
                          className="mb-3"
                        >
                          <div className="fw-semibold">{item.name}</div>
                          <div className="text-muted small mb-2">
                            {item.description}
                          </div>
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
                            value={add.pickId || ""}
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
                            value={add.name || ""}
                            onChange={(e) =>
                              setAddingField(inq.id, "name", e.target.value)
                            }
                            disabled={busy}
                          />
                        </Col>

                        <Col lg={6}>
                          <Form.Label className="mb-1">Description</Form.Label>
                          <Form.Control
                            placeholder="Description"
                            value={add.description || ""}
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
                              value={add.price || ""}
                              onChange={(e) =>
                                setAddingField(inq.id, "price", e.target.value)
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
                            value={add.quantity || ""}
                            onChange={(e) =>
                              setAddingField(inq.id, "quantity", e.target.value)
                            }
                            disabled={busy}
                          />
                        </Col>

                        <Col lg={1} className="d-flex justify-content-end">
                          <Button
                            size="sm"
                            className="text-nowrap mt-4"
                            onClick={() => addItem(inq)}
                            disabled={busy || !add.name}
                          >
                            Add
                          </Button>
                        </Col>
                      </Row>
                    </div>

                    <div className="line my-3"></div>

                    {/* Charges desktop, unchanged */}
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
              </Card>
            </Col>
          );
        })}
      </Row>
    </Container>
  );
}
