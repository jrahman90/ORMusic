import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Container,
  Form,
  Modal,
  Spinner,
} from "react-bootstrap";
import { doc, getDoc, onSnapshot, serverTimestamp, updateDoc } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { Link, useParams } from "react-router-dom";
import QRCode from "qrcode";
import { v4 as uuidv4 } from "uuid";
import db from "../../api/firestore/firestore";
import { prettyDate, to12h } from "../../utils/formatters";

const normalizeEvents = (events = []) =>
  (Array.isArray(events) ? events : []).map((event, index) => ({
    ...event,
    id: event?.id || `event-${index}`,
  }));

const eventLabel = (event) => {
  const date = event?.date ? prettyDate(event.date) : "Date TBD";
  const time =
    event?.startTime || event?.endTime
      ? `${event?.startTime ? to12h(event.startTime) : "Start TBD"} - ${
          event?.endTime ? to12h(event.endTime) : "End TBD"
        }`
      : "Time TBD";
  return `${date} | ${time}`;
};

const dateFromItinerary = (itinerary, event) => {
  if (event?.date) return prettyDate(event.date);
  const date = Array.isArray(itinerary?.date) ? itinerary.date[0] : null;
  if (!date?.month && !date?.day && !date?.year) return "Date TBD";
  return [date.month, date.day, date.year].filter(Boolean).join("/");
};

const timestampToDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "number") return new Date(value);
  if (typeof value?.toDate === "function") return value.toDate();
  if (typeof value?.seconds === "number") return new Date(value.seconds * 1000);
  return null;
};

const formatLastEdit = (value) => {
  const date = timestampToDate(value);
  if (!date || Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export default function ItineraryPrintPage({ publicView = false }) {
  const { inquiryId, eventId, token } = useParams();
  const [authState, setAuthState] = useState({
    loading: !publicView,
    user: null,
    isAdmin: false,
  });
  const [inquiry, setInquiry] = useState(null);
  const [loadingInquiry, setLoadingInquiry] = useState(true);
  const [error, setError] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [showPrintOptions, setShowPrintOptions] = useState(false);
  const [printIntent, setPrintIntent] = useState("print");
  const [selectedSectionIndexes, setSelectedSectionIndexes] = useState([]);

  useEffect(() => {
    if (publicView) return undefined;
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setAuthState({ loading: false, user: null, isAdmin: false });
        return;
      }
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        setAuthState({
          loading: false,
          user,
          isAdmin: Boolean(snap.exists() && snap.data()?.isAdmin),
        });
      } catch {
        setAuthState({ loading: false, user, isAdmin: false });
      }
    });
    return () => unsub();
  }, [publicView]);

  useEffect(() => {
    if (!inquiryId) return;
    const unsub = onSnapshot(
      doc(db, "inquiries", inquiryId),
      (snap) => {
        if (!snap.exists()) {
          setInquiry(null);
          setLoadingInquiry(false);
          return;
        }
        setInquiry({ id: snap.id, ...snap.data() });
        setLoadingInquiry(false);
      },
      () => {
        setError(
          publicView
            ? "This public itinerary is not available."
            : "Unable to load this itinerary."
        );
        setLoadingInquiry(false);
      }
    );
    return () => unsub();
  }, [inquiryId, publicView]);

  const events = useMemo(() => normalizeEvents(inquiry?.events), [inquiry]);
  const event = events.find((row) => row.id === eventId);
  const itinerary = event?.itinerary;
  const sections = useMemo(
    () => (Array.isArray(itinerary?.sections) ? itinerary.sections : []),
    [itinerary]
  );
  const sectionCount = sections.length;
  const canAccess =
    publicView
      ? Boolean(itinerary?.publicToken && token === itinerary.publicToken)
      : authState.isAdmin ||
        (authState.user && inquiry?.userId && inquiry.userId === authState.user.uid);
  const editPath = `/inquiries/${inquiryId}/events/${eventId}/itinerary`;
  const publicPath = itinerary?.publicToken
    ? `/itinerary/public/${inquiryId}/${eventId}/${itinerary.publicToken}`
    : "";
  const publicUrl =
    publicPath && typeof window !== "undefined"
      ? `${window.location.origin}${publicPath}`
      : "";
  const canUpdateChecklist = !publicView && canAccess;

  useEffect(() => {
    if (publicView || !canAccess || !event || !itinerary || itinerary.publicToken) {
      return;
    }
    const nextEvents = events.map((row) =>
      row.id === eventId
        ? {
            ...row,
            itinerary: {
              ...itinerary,
              publicToken: uuidv4(),
              updatedAt: Date.now(),
            },
          }
        : row
    );
    updateDoc(doc(db, "inquiries", inquiryId), {
      events: nextEvents,
      updatedAt: serverTimestamp(),
    }).catch(() => {
      setError("Unable to prepare the public QR link for this itinerary.");
    });
  }, [canAccess, event, eventId, events, inquiryId, itinerary, publicView]);

  useEffect(() => {
    if (!itinerary) return;
    document.title = publicView
      ? `${itinerary.name || "Live Itinerary"} | OR Music Events`
      : `${itinerary.name || "Event Itinerary"} | OR Music Events`;
  }, [itinerary, publicView]);

  useEffect(() => {
    let cancelled = false;
    if (!publicUrl) {
      setQrCode("");
      return undefined;
    }
    QRCode.toDataURL(publicUrl, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 140,
    })
      .then((url) => {
        if (!cancelled) setQrCode(url);
      })
      .catch(() => {
        if (!cancelled) setQrCode("");
      });
    return () => {
      cancelled = true;
    };
  }, [publicUrl]);

  useEffect(() => {
    setSelectedSectionIndexes((current) => {
      const allIndexes = Array.from({ length: sectionCount }, (_, index) => index);
      const validCurrent = current.filter((index) => index < sectionCount);
      return validCurrent.length === current.length && current.length > 0
        ? validCurrent
        : allIndexes;
    });
  }, [sectionCount]);

  const openPrintOptions = (intent) => {
    setPrintIntent(intent);
    setShowPrintOptions(true);
  };

  const toggleSectionSelection = (sectionIndex) => {
    setSelectedSectionIndexes((current) =>
      current.includes(sectionIndex)
        ? current.filter((index) => index !== sectionIndex)
        : [...current, sectionIndex].sort((a, b) => a - b)
    );
  };

  const confirmPrint = () => {
    if (selectedSectionIndexes.length === 0) return;
    setShowPrintOptions(false);
    window.setTimeout(() => window.print(), 100);
  };

  if (authState.loading || loadingInquiry) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" />
      </Container>
    );
  }

  if (!publicView && !authState.user) {
    return (
      <Container className="py-4">
        <Alert variant="warning">Please log in to view this itinerary.</Alert>
      </Container>
    );
  }

  if (error || !inquiry || !event) {
    return (
      <Container className="py-4">
        <Alert variant="danger">{error || "Itinerary not found."}</Alert>
      </Container>
    );
  }

  if (!canAccess) {
    return (
      <Container className="py-4">
        <Alert variant="danger">
          {publicView
            ? "This public itinerary link is not valid."
            : "You do not have access to this itinerary."}
        </Alert>
      </Container>
    );
  }

  if (!itinerary) {
    return (
      <Container className="py-4">
        <Alert variant="light" className="border">
          No itinerary has been created for this event yet.
        </Alert>
        <Button as={Link} to={editPath} variant="primary">
          Create itinerary
        </Button>
      </Container>
    );
  }

  const printableSections = sections.filter((_, index) =>
    selectedSectionIndexes.includes(index)
  );

  const toggleRowDone = async (sectionIndex, rowIndex, checked) => {
    if (!canUpdateChecklist || !inquiry || !event || !itinerary) return;
    const nextSections = sections.map((section, currentSectionIndex) => {
      if (currentSectionIndex !== sectionIndex) return section;
      return {
        ...section,
        items: (section.items || []).map((row, currentRowIndex) =>
          currentRowIndex === rowIndex ? { ...row, __done: checked } : row
        ),
      };
    });
    const nextEvents = events.map((row) =>
      row.id === eventId
        ? {
            ...row,
            itinerary: {
              ...itinerary,
              sections: nextSections,
              updatedAt: Date.now(),
            },
          }
        : row
    );
    try {
      await updateDoc(doc(db, "inquiries", inquiryId), {
        events: nextEvents,
        updatedAt: serverTimestamp(),
      });
    } catch {
      setError("Unable to update this checklist item.");
    }
  };

  return (
    <div className="itinerary-print-shell">
      {!publicView ? (
      <div className="itinerary-print-toolbar no-print">
        <Button as={Link} to={editPath} variant="outline-secondary">
          Back to editor
        </Button>
        <div className="itinerary-print-toolbar-actions">
          <Button
            variant="outline-primary"
            onClick={() => openPrintOptions("print")}
          >
            Print
          </Button>
          <Button
            variant="primary"
            onClick={() => openPrintOptions("download")}
          >
            Download PDF
          </Button>
        </div>
      </div>
      ) : (
        <div className="itinerary-public-banner no-print">
          <strong>Live view</strong>
          <span>Read-only public itinerary</span>
          <span>Last edit: {formatLastEdit(itinerary?.updatedAt)}</span>
        </div>
      )}

      <main className="itinerary-print-page">
        <img
          className="itinerary-print-watermark"
          src="/ormusiclogo.png"
          alt=""
          aria-hidden="true"
        />
        <header className="itinerary-print-hero">
          <div>
            <div className="itinerary-print-kicker">OR Music Events</div>
            <h1>{itinerary.name || `${inquiry?.name || "Client"} Itinerary`}</h1>
            <p>{eventLabel(event)}</p>
          </div>
          <div className="itinerary-print-side">
            <div className="itinerary-print-date">
              <span>Event Date</span>
              <strong>{dateFromItinerary(itinerary, event)}</strong>
            </div>
            {qrCode ? (
              <div className="itinerary-print-qr">
                <img src={qrCode} alt="QR code for live public itinerary" />
                <span>Scan for live itinerary</span>
              </div>
            ) : null}
          </div>
        </header>

        <section className="itinerary-print-summary">
          <div>
            <span>Client</span>
            <strong>{inquiry?.name || "Client"}</strong>
          </div>
          <div>
            <span>Event</span>
            <strong>{itinerary.eventType || event?.type || "Event"}</strong>
          </div>
          <div>
            <span>Venue</span>
            <strong>{event?.venue || "Venue TBD"}</strong>
          </div>
          <div>
            <span>Contact</span>
            <strong>{inquiry?.phoneNumber || inquiry?.email || "Not provided"}</strong>
          </div>
        </section>

        {printableSections.map((section, visibleIndex) => {
          const sectionIndex = sections.indexOf(section);
          const fields = Array.isArray(section.fields) ? section.fields : [];
          const rows = Array.isArray(section.items) ? section.items : [];
          return (
            <section className="itinerary-print-section" key={`${section.title}-${sectionIndex}-${visibleIndex}`}>
              <h2>{section.title || "Itinerary Section"}</h2>
              {fields.length === 0 ? (
                <p className="itinerary-print-empty">No fields in this section.</p>
              ) : rows.length === 0 ? (
                <p className="itinerary-print-empty">No entries yet.</p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th className="itinerary-print-check-header">Done</th>
                      {fields.map((field) => (
                        <th key={field}>{field}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, rowIndex) => (
                      <tr
                        key={rowIndex}
                        className={row?.__done ? "itinerary-print-row-done" : ""}
                      >
                        <td className="itinerary-print-check-cell">
                          <Form.Check
                            type="checkbox"
                            aria-label={`Mark row ${rowIndex + 1} done`}
                            checked={Boolean(row?.__done)}
                            disabled={!canUpdateChecklist}
                            onChange={(e) =>
                              toggleRowDone(
                                sectionIndex,
                                rowIndex,
                                e.target.checked
                              )
                            }
                          />
                        </td>
                        {fields.map((field) => (
                          <td key={field}>{row?.[field] || "-"}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          );
        })}
      </main>

      <Modal
        show={showPrintOptions}
        onHide={() => setShowPrintOptions(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {printIntent === "download" ? "Download PDF" : "Print itinerary"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="text-muted">
            Choose which sections to include. Event details, QR code, and the
            watermark will always be included.
          </p>
          <div className="itinerary-print-picker-actions">
            <Button
              size="sm"
              variant="outline-secondary"
              onClick={() =>
                setSelectedSectionIndexes(sections.map((_, index) => index))
              }
            >
              Select all
            </Button>
            <Button
              size="sm"
              variant="outline-secondary"
              onClick={() => setSelectedSectionIndexes([])}
            >
              Clear all
            </Button>
          </div>
          <div className="itinerary-print-picker-list">
            {sections.map((section, sectionIndex) => (
              <Form.Check
                key={`${section.title || "section"}-${sectionIndex}`}
                type="checkbox"
                id={`print-section-${sectionIndex}`}
                label={section.title || `Section ${sectionIndex + 1}`}
                checked={selectedSectionIndexes.includes(sectionIndex)}
                onChange={() => toggleSectionSelection(sectionIndex)}
              />
            ))}
          </div>
          {selectedSectionIndexes.length === 0 ? (
            <Alert variant="warning" className="mt-3 mb-0">
              Select at least one section before continuing.
            </Alert>
          ) : null}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="outline-secondary"
            onClick={() => setShowPrintOptions(false)}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={confirmPrint}
            disabled={selectedSectionIndexes.length === 0}
          >
            {printIntent === "download" ? "Continue to PDF" : "Continue to print"}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
