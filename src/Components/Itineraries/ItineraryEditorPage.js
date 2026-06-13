import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Container,
  Form,
  InputGroup,
  Modal,
  Spinner,
} from "react-bootstrap";
import {
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  getDoc,
} from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { Link, useParams } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import db from "../../api/firestore/firestore";
import { prettyDate, to12h } from "../../utils/formatters";

const timeToMinutes = (value) => {
  const [hours, minutes = "0"] = String(value || "").split(":");
  const h = Number(hours);
  const m = Number(minutes);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
};

const formatHourLabel = (minutes) => {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  return to12h(`${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`);
};

const buildTimelineRows = (event) => {
  const start = timeToMinutes(event?.startTime);
  let end = timeToMinutes(event?.endTime);
  if (start == null || end == null) return [];
  if (end < start) end += 24 * 60;

  const rows = [];
  const first = Math.floor(start / 60) * 60;
  for (let current = first; current <= end; current += 60) {
    if (current >= start || current === first) {
      rows.push({ Time: formatHourLabel(current), Details: "", Notes: "" });
    }
  }
  return rows;
};

const defaultSections = (event) => [
  {
    title: "Vendor List",
    fields: ["name", "role", "company", "contact", "arrival"],
    items: [],
  },
  {
    title: "TimeLine",
    fields: ["Time", "Details", "Notes"],
    items: buildTimelineRows(event),
  },
];

const normalizeEvents = (events = []) =>
  (Array.isArray(events) ? events : []).map((event, index) => ({
    ...event,
    id: event?.id || `event-${index}`,
  }));

const eventDateParts = (date) => {
  const [year = "", month = "", day = ""] = String(date || "").split("-");
  return { month, day, year };
};

const eventLabel = (event) => {
  const date = event?.date ? prettyDate(event.date) : "Date TBD";
  const time =
    event?.startTime || event?.endTime
      ? `, ${event?.startTime ? to12h(event.startTime) : "Start TBD"} - ${
          event?.endTime ? to12h(event.endTime) : "End TBD"
        }`
      : "";
  const venue = event?.venue ? ` at ${event.venue}` : "";
  return `${event?.type || "Event"} on ${date}${time}${venue}`;
};

const isConfirmed = (status) => {
  const s = String(status || "").toLowerCase();
  return s === "confirmed" || s === "completed";
};

const normalizeSectionTitle = (value = "") =>
  String(value).toLowerCase().replace(/[^a-z0-9]/g, "");

const SECTION_TYPES = {
  generic: {
    label: "Generic section",
    defaultTitle: "New Section",
    fields: ["Details", "Notes"],
  },
  timeline: {
    label: "Timeline section",
    defaultTitle: "Time Line",
    fields: ["Time", "Details", "Notes"],
  },
  contact: {
    label: "Contact list",
    defaultTitle: "Contact List",
    fields: ["Name", "Title", "Contact"],
  },
};

const inferSectionType = (title = "") => {
  const key = normalizeSectionTitle(title);
  if (key.includes("timeline")) return "timeline";
  if (key.includes("vendor") || key.includes("contact")) return "contact";
  return "generic";
};

const inferSectionFields = (title = "", sectionType) =>
  SECTION_TYPES[sectionType || inferSectionType(title)]?.fields ||
  SECTION_TYPES.generic.fields;

const pickField = (fields, candidates, fallbackIndex = 0) => {
  const normalized = fields.map((field) => normalizeSectionTitle(field));
  const foundIndex = candidates
    .map(normalizeSectionTitle)
    .map((candidate) => normalized.findIndex((field) => field === candidate))
    .find((index) => index >= 0);
  return fields[foundIndex >= 0 ? foundIndex : fallbackIndex] || fields[0];
};

const splitSectionImport = (rawText = "") => {
  const text = String(rawText || "").trim();
  const match = text.match(/^Section\s*:\s*([^,\n]+)\s*,\s*Content\s*:\s*/i);
  if (!match) return { sectionTitle: "Time Line", content: text };
  return {
    sectionTitle: match[1].trim() || "Time Line",
    content: text.slice(match[0].length).trim(),
  };
};

const splitNote = (value = "") => {
  const text = String(value || "").trim();
  const match = text.match(/(?:\s*(?:\||,|-)\s*)Notes?\s*:\s*(.+)$/i);
  if (!match) return { main: text, notes: "" };
  return {
    main: text.slice(0, match.index).trim(),
    notes: match[1].trim(),
  };
};

const parseTimelineRows = (rawText = "") => {
  const rows = [];
  const timePattern =
    /^(\d{1,2}(?::\d{2})?(?:\s?[ap]m)?(?:\s*\/\s*\d{1,2}(?::\d{2})?(?:\s?[ap]m)?)?)\s*:\s*(.*)$/i;

  String(rawText || "")
    .replace(/\u00a0/g, " ")
    .split(/\r?\n/)
    .forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      const match = trimmed.match(timePattern);
      if (match) {
        const { main, notes } = splitNote(match[2]);
        rows.push({
          time: match[1].replace(/\s+/g, " ").trim(),
          details: main,
          notes,
        });
        return;
      }
      if (rows.length > 0) {
        const last = rows[rows.length - 1];
        last.details = [last.details, trimmed].filter(Boolean).join("\n");
      } else {
        rows.push({ time: "", details: trimmed, notes: "" });
      }
    });

  return rows;
};

const parseGenericRows = (rawText = "") =>
  String(rawText || "")
    .replace(/\u00a0/g, " ")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const { main, notes } = splitNote(line);
      return { time: "", details: main, notes };
    });

const parseContactRows = (rawText = "") =>
  String(rawText || "")
    .replace(/\u00a0/g, " ")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line
        .split(/\s*(?:\||\t| - |,)\s*/)
        .map((part) => part.trim())
        .filter(Boolean);
      return {
        name: parts[0] || line,
        title: parts[1] || "",
        contact: parts.slice(2).join(", "),
      };
    });

const parseSectionImport = (input = "") => {
  const source =
    typeof input === "string" ? splitSectionImport(input) : { ...input };
  const content = source.content || "";
  const sectionTitle =
    source.sectionTitle ||
    SECTION_TYPES[source.sectionType]?.defaultTitle ||
    SECTION_TYPES.generic.defaultTitle;
  const sectionType = source.sectionType || inferSectionType(sectionTitle);
  const parsedRows =
    sectionType === "timeline"
      ? parseTimelineRows(content)
      : sectionType === "contact"
      ? parseContactRows(content)
      : parseGenericRows(content);
  return { sectionTitle, sectionType, parsedRows };
};

const buildItinerary = (inquiry, event) => ({
  docType: "Itinerary",
  name: `${inquiry?.name || "Client"} - ${event?.type || "Event"}`,
  eventType: event?.type || "Event",
  date: [eventDateParts(event?.date)],
  publicToken: uuidv4(),
  sections: defaultSections(event),
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

const cleanItinerary = (itinerary = {}) => ({
  docType: "Itinerary",
  name: itinerary.name || "",
  eventType: itinerary.eventType || "",
  date: Array.isArray(itinerary.date) ? itinerary.date : [],
  publicToken: itinerary.publicToken || uuidv4(),
  sections: Array.isArray(itinerary.sections) ? itinerary.sections : [],
  createdAt: itinerary.createdAt || Date.now(),
  updatedAt: Date.now(),
});

const moveItem = (list = [], fromIndex, toIndex) => {
  const next = [...list];
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= next.length ||
    toIndex >= next.length
  ) {
    return next;
  }
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
};

export default function ItineraryEditorPage() {
  const { inquiryId, eventId } = useParams();
  const [authState, setAuthState] = useState({
    loading: true,
    user: null,
    isAdmin: false,
  });
  const [inquiry, setInquiry] = useState(null);
  const [loadingInquiry, setLoadingInquiry] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
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
  }, []);

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
        setError("Unable to load this inquiry.");
        setLoadingInquiry(false);
      }
    );
    return () => unsub();
  }, [inquiryId]);

  const events = useMemo(() => normalizeEvents(inquiry?.events), [inquiry]);
  const event = events.find((row) => row.id === eventId);
  const itinerary = event?.itinerary;
  const canAccess =
    authState.isAdmin ||
    (authState.user && inquiry?.userId && inquiry.userId === authState.user.uid);
  const canEdit = canAccess && isConfirmed(inquiry?.status);
  const backTo = authState.isAdmin ? "/inquiries-admin" : "/inquiries";
  const printPath = `/inquiries/${inquiryId}/events/${eventId}/itinerary/print`;

  const saveEvents = async (nextEvents) => {
    setSaving(true);
    try {
      await updateDoc(doc(db, "inquiries", inquiry.id), {
        events: nextEvents,
        updatedAt: serverTimestamp(),
      });
    } finally {
      setSaving(false);
    }
  };

  const updateEvent = async (updater) => {
    const nextEvents = events.map((row) =>
      row.id === eventId ? updater(row) : row
    );
    await saveEvents(nextEvents);
  };

  const createItinerary = () =>
    updateEvent((current) => ({
      ...current,
      itinerary: buildItinerary(inquiry, current),
    }));

  const deleteItinerary = async () => {
    if (!authState.isAdmin || !itinerary) return;
    await updateEvent((current) => {
      const { itinerary: _removed, ...eventWithoutItinerary } = current;
      return eventWithoutItinerary;
    });
  };

  const requestDeleteItinerary = () => {
    setConfirmDelete({
      title: "Delete itinerary?",
      message:
        "This removes the itinerary for this event only. The inquiry and event will stay in place.",
      confirmText: "Delete itinerary",
      onConfirm: deleteItinerary,
    });
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete?.onConfirm) return;
    await confirmDelete.onConfirm();
    setConfirmDelete(null);
  };

  const updateItinerary = (updater) =>
    updateEvent((current) => ({
      ...current,
      itinerary: cleanItinerary(
        updater(current.itinerary || buildItinerary(inquiry, current))
      ),
    }));

  const updateInfo = (nextInfo) =>
    updateItinerary((current) => ({
      ...current,
      name: nextInfo.name || "",
      eventType: nextInfo.eventType || "",
      date: [
        {
          month: nextInfo.month || "",
          day: nextInfo.day || "",
          year: nextInfo.year || "",
        },
      ],
    }));

  const updateSection = (sectionIndex, updater) =>
    updateItinerary((current) => {
      const sections = [...(current.sections || [])];
      sections[sectionIndex] = updater(sections[sectionIndex]);
      return { ...current, sections };
    });

  const updateSectionSchema = (sectionIndex, nextTitle, nextFields) =>
    updateSection(sectionIndex, (section) => {
      const oldFields = Array.isArray(section.fields) ? section.fields : [];
      const seen = new Set();
      const fields = (Array.isArray(nextFields) ? nextFields : oldFields)
        .map((field) => String(field || "").trim())
        .filter(Boolean)
        .map((field, index) => {
          let candidate = field;
          while (seen.has(normalizeSectionTitle(candidate))) {
            candidate = `${field} ${index + 1}`;
          }
          seen.add(normalizeSectionTitle(candidate));
          return candidate;
        });
      const safeFields = fields.length ? fields : oldFields;
      const items = (section.items || []).map((item) => {
        const nextItem = {};
        safeFields.forEach((field, index) => {
          const oldField = oldFields[index];
          nextItem[field] =
            item?.[field] != null ? item[field] : item?.[oldField] || "";
        });
        return nextItem;
      });
      return {
        ...section,
        title: String(nextTitle || "").trim() || section.title || "Section",
        fields: safeFields,
        items,
      };
    });

  const addSection = () =>
    updateItinerary((current) => ({
      ...current,
      sections: [
        ...(current.sections || []),
        { title: "New Section", fields: ["field1", "field2"], items: [] },
      ],
    }));

  const deleteSection = (sectionIndex) =>
    updateItinerary((current) => ({
      ...current,
      sections: (current.sections || []).filter((_, i) => i !== sectionIndex),
    }));

  const reorderSections = (fromIndex, toIndex) =>
    updateItinerary((current) => ({
      ...current,
      sections: moveItem(current.sections || [], fromIndex, toIndex),
    }));

  const deleteField = (sectionIndex, fieldIndex) =>
    updateSection(sectionIndex, (section) => {
      const fields = [...(section.fields || [])];
      const removed = fields.splice(fieldIndex, 1)[0];
      const items = (section.items || []).map((item) => {
        const copy = { ...item };
        delete copy[removed];
        return copy;
      });
      return { ...section, fields, items };
    });

  const addRow = (sectionIndex) =>
    updateSection(sectionIndex, (section) => {
      const newRow = {};
      (section.fields || []).forEach((field) => {
        newRow[field] = "";
      });
      return { ...section, items: [...(section.items || []), newRow] };
    });

  const deleteRow = (sectionIndex, rowIndex) =>
    updateSection(sectionIndex, (section) => ({
      ...section,
      items: (section.items || []).filter((_, i) => i !== rowIndex),
    }));

  const updateRow = (sectionIndex, rowIndex, nextRow) =>
    updateSection(sectionIndex, (section) => {
      const items = [...(section.items || [])];
      items[rowIndex] = { ...(items[rowIndex] || {}), ...nextRow };
      return { ...section, items };
    });

  const reorderRows = (sectionIndex, fromIndex, toIndex) =>
    updateSection(sectionIndex, (section) => ({
      ...section,
      items: moveItem(section.items || [], fromIndex, toIndex),
    }));

  const importSectionText = (importConfig) =>
    updateItinerary((current) => {
      const { sectionTitle, sectionType, parsedRows } =
        parseSectionImport(importConfig);
      if (parsedRows.length === 0) return current;

      const sections = [...(current.sections || [])];
      const targetTitleKey = normalizeSectionTitle(sectionTitle);
      const targetIndex = sections.findIndex(
        (section) => normalizeSectionTitle(section?.title) === targetTitleKey
      );
      const existingSection =
        targetIndex >= 0
          ? sections[targetIndex]
          : {
              title: sectionTitle,
              fields: inferSectionFields(sectionTitle, sectionType),
              items: [],
            };
      const fields = inferSectionFields(sectionTitle, sectionType);
      const importedItems = parsedRows.map((row) => {
        const item = {};
        fields.forEach((field) => {
          item[field] = "";
        });
        if (sectionType === "timeline") {
          const timeField = pickField(fields, ["Time"], 0);
          const detailsField = pickField(fields, ["Details"], 1);
          const notesField = pickField(fields, ["Notes"], 2);
          item[timeField] = row.time;
          item[detailsField] = row.details;
          item[notesField] = row.notes;
        } else if (sectionType === "contact") {
          const nameField = pickField(fields, ["Name"], 0);
          const titleField = pickField(fields, ["Title", "Role"], 1);
          const contactField = pickField(fields, ["Contact", "Phone", "Email"], 2);
          item[nameField] = row.name;
          item[titleField] = row.title;
          item[contactField] = row.contact;
        } else {
          const detailsField = pickField(fields, ["Details", "Content"], 0);
          const notesField = pickField(fields, ["Notes"], 1);
          item[detailsField] = row.details;
          item[notesField] = row.notes;
        }
        return item;
      });
      const nextSection = {
        ...existingSection,
        fields,
        items: importedItems,
      };

      if (targetIndex >= 0) {
        sections[targetIndex] = nextSection;
      } else {
        sections.push(nextSection);
      }

      return { ...current, sections };
    });

  if (authState.loading || loadingInquiry) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" />
      </Container>
    );
  }

  if (!authState.user) {
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
        <Alert variant="danger">You do not have access to this itinerary.</Alert>
      </Container>
    );
  }

  return (
    <Container fluid="lg" className="itinerary-page py-3">
      <div className="itinerary-page-header">
        <div>
          <Button
            as={Link}
            to={backTo}
            variant="outline-secondary"
            size="sm"
            className="mb-2"
          >
            Back to inquiries
          </Button>
          <h1>Event Itinerary</h1>
          <p>{eventLabel(event)}</p>
        </div>
        <div className="itinerary-page-actions">
          <Badge bg={saving ? "warning" : "success"} text={saving ? "dark" : undefined}>
            {saving ? "Saving..." : "Live saved"}
          </Badge>
          {itinerary ? (
            <Button as={Link} to={printPath} variant="outline-primary" size="sm">
              View PDF
            </Button>
          ) : null}
          {authState.isAdmin && itinerary ? (
            <Button
              variant="outline-danger"
              size="sm"
              onClick={requestDeleteItinerary}
              disabled={saving}
            >
              Delete itinerary
            </Button>
          ) : null}
        </div>
      </div>

      {!canEdit ? (
        <Alert variant="light" className="border">
          Itineraries can be edited once the inquiry is confirmed.
        </Alert>
      ) : !itinerary ? (
        <Card className="itinerary-empty-card">
          <Card.Body>
            <h2>Create itinerary</h2>
            <p>
              Start with the Eventure itinerary template, then customize the
              sections, fields, and timeline for this event.
            </p>
            <Button onClick={createItinerary}>Create itinerary</Button>
          </Card.Body>
        </Card>
      ) : (
        <ItineraryEditor
          itinerary={itinerary}
          onInfo={updateInfo}
          onAddSection={addSection}
          onDeleteSection={deleteSection}
          onReorderSections={reorderSections}
          onSectionSchema={updateSectionSchema}
          onDeleteField={deleteField}
          onAddRow={addRow}
          onDeleteRow={deleteRow}
          onReorderRows={reorderRows}
          onRow={updateRow}
          onImportText={importSectionText}
        />
      )}
      <ConfirmDeleteModal
        show={Boolean(confirmDelete)}
        title={confirmDelete?.title}
        message={confirmDelete?.message}
        confirmText={confirmDelete?.confirmText}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={handleConfirmDelete}
      />
    </Container>
  );
}

function ItineraryEditor({
  itinerary,
  onInfo,
  onAddSection,
  onDeleteSection,
  onReorderSections,
  onSectionSchema,
  onDeleteField,
  onAddRow,
  onDeleteRow,
  onReorderRows,
  onRow,
  onImportText,
}) {
  const date = Array.isArray(itinerary?.date) ? itinerary.date[0] || {} : {};
  const [editingFields, setEditingFields] = useState({});
  const [editingInfo, setEditingInfo] = useState(false);
  const [infoDraft, setInfoDraft] = useState(null);
  const [editingRows, setEditingRows] = useState({});
  const [rowDrafts, setRowDrafts] = useState({});
  const rowDraftsRef = useRef({});
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState({});
  const [sectionDrafts, setSectionDrafts] = useState({});
  const [reorderingSections, setReorderingSections] = useState(false);
  const [reorderingRows, setReorderingRows] = useState({});
  const [draggingSectionIndex, setDraggingSectionIndex] = useState(null);
  const [draggingRow, setDraggingRow] = useState(null);
  const touchDragRef = useRef(null);

  const rowKey = (sectionIndex, rowIndex) => `${sectionIndex}-${rowIndex}`;
  const sectionKey = (section, sectionIndex) =>
    `${section?.title || "section"}-${sectionIndex}`;

  const makeRowDraft = (row, fields = []) => {
    const draft = {};
    fields.forEach((field) => {
      draft[field] = row?.[field] || "";
    });
    return draft;
  };

  const setRowDraftStore = (updater) => {
    const next =
      typeof updater === "function" ? updater(rowDraftsRef.current) : updater;
    rowDraftsRef.current = next;
    setRowDrafts(next);
  };

  const makeInfoDraft = () => ({
    name: itinerary.name || "",
    eventType: itinerary.eventType || "",
    month: date.month || "",
    day: date.day || "",
    year: date.year || "",
  });

  const startInfoEditing = () => {
    setInfoDraft(makeInfoDraft());
    setEditingInfo(true);
  };

  const finishInfoEditing = () => {
    onInfo(infoDraft || makeInfoDraft());
    setEditingInfo(false);
  };

  const makeSectionDraft = (section) => ({
    title: section?.title || "",
    fields: Array.isArray(section?.fields) ? [...section.fields] : [],
  });

  const getSectionDraft = (section, sectionIndex) =>
    sectionDrafts[sectionIndex] || makeSectionDraft(section);

  const updateSectionDraft = (sectionIndex, updater) => {
    setSectionDrafts((current) => {
      const sections = Array.isArray(itinerary.sections) ? itinerary.sections : [];
      const existing = current[sectionIndex] || makeSectionDraft(sections[sectionIndex]);
      return { ...current, [sectionIndex]: updater(existing) };
    });
  };

  const startSectionEditing = (section, sectionIndex) => {
    setSectionDrafts((current) => ({
      ...current,
      [sectionIndex]: makeSectionDraft(section),
    }));
    setEditingFields((current) => ({ ...current, [sectionIndex]: true }));
  };

  const finishSectionEditing = (section, sectionIndex) => {
    const draft = getSectionDraft(section, sectionIndex);
    onSectionSchema(sectionIndex, draft.title, draft.fields);
    setEditingFields((current) => ({ ...current, [sectionIndex]: false }));
  };

  const toggleFieldEditing = (section, sectionIndex) => {
    if (editingFields[sectionIndex]) {
      finishSectionEditing(section, sectionIndex);
    } else {
      startSectionEditing(section, sectionIndex);
    }
  };

  const handleAddField = (section, sectionIndex) => {
    const draft = getSectionDraft(section, sectionIndex);
    const field = `field${draft.fields.length + 1}`;
    updateSectionDraft(sectionIndex, (current) => ({
      ...current,
      fields: [...current.fields, field],
    }));
    setEditingFields((current) => ({ ...current, [sectionIndex]: true }));
  };

  const handleDeleteFieldDraft = (section, sectionIndex, fieldIndex) => {
    updateSectionDraft(sectionIndex, (current) => ({
      ...current,
      fields: current.fields.filter((_, index) => index !== fieldIndex),
    }));
  };

  const startRowEditing = (section, sectionIndex, rowIndex) => {
    const key = rowKey(sectionIndex, rowIndex);
    setRowDraftStore((current) => ({
      ...current,
      [key]: makeRowDraft(
        section?.items?.[rowIndex],
        Array.isArray(section?.fields) ? section.fields : []
      ),
    }));
    setEditingRows((current) => ({ ...current, [key]: true }));
  };

  const finishRowEditing = (section, sectionIndex, rowIndex) => {
    const key = rowKey(sectionIndex, rowIndex);
    const fields = Array.isArray(section?.fields) ? section.fields : [];
    const draft =
      rowDraftsRef.current[key] ||
      makeRowDraft(section?.items?.[rowIndex], fields);
    const nextRow = {};
    fields.forEach((field) => {
      nextRow[field] = draft[field] || "";
    });
    onRow(sectionIndex, rowIndex, nextRow);
    setEditingRows((current) => ({ ...current, [key]: false }));
  };

  const updateRowDraft = (section, sectionIndex, rowIndex, field, value) => {
    const key = rowKey(sectionIndex, rowIndex);
    setRowDraftStore((current) => ({
      ...current,
      [key]: {
        ...(current[key] ||
          makeRowDraft(
            section?.items?.[rowIndex],
            Array.isArray(section?.fields) ? section.fields : []
          )),
        [field]: value,
      },
    }));
  };

  const handleAddRow = (section, sectionIndex, nextRowIndex) => {
    const fields = Array.isArray(section?.fields) ? section.fields : [];
    const blankRow = makeRowDraft({}, fields);
    setEditingRows((current) => ({
      ...current,
      [rowKey(sectionIndex, nextRowIndex)]: true,
    }));
    setRowDraftStore((current) => ({
      ...current,
      [rowKey(sectionIndex, nextRowIndex)]: blankRow,
    }));
    onAddRow(sectionIndex);
  };

  const toggleSection = (section, sectionIndex) => {
    const key = sectionKey(section, sectionIndex);
    setCollapsedSections((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  const toggleSectionReorder = () => {
    setReorderingSections((current) => !current);
    setDraggingSectionIndex(null);
  };

  const toggleRowReorder = (sectionIndex) => {
    setReorderingRows((current) => ({
      ...current,
      [sectionIndex]: !current[sectionIndex],
    }));
    setDraggingRow(null);
  };

  const dropSection = (toIndex) => {
    if (
      draggingSectionIndex != null &&
      draggingSectionIndex !== toIndex
    ) {
      onReorderSections(draggingSectionIndex, toIndex);
    }
    setDraggingSectionIndex(null);
  };

  const dropRow = (sectionIndex, toIndex) => {
    if (
      draggingRow &&
      draggingRow.sectionIndex === sectionIndex &&
      draggingRow.rowIndex !== toIndex
    ) {
      onReorderRows(sectionIndex, draggingRow.rowIndex, toIndex);
    }
    setDraggingRow(null);
  };

  const startTouchSectionDrag = (sectionIndex) => {
    if (!reorderingSections) return;
    touchDragRef.current = {
      type: "section",
      fromIndex: sectionIndex,
      toIndex: sectionIndex,
    };
    setDraggingSectionIndex(sectionIndex);
  };

  const startTouchRowDrag = (sectionIndex, rowIndex) => {
    if (!reorderingRows[sectionIndex]) return;
    touchDragRef.current = {
      type: "row",
      sectionIndex,
      fromIndex: rowIndex,
      toIndex: rowIndex,
    };
    setDraggingRow({ sectionIndex, rowIndex });
  };

  const moveTouchDrag = (e) => {
    const drag = touchDragRef.current;
    const touch = e.touches?.[0];
    if (!drag || !touch) return;
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!target) return;
    if (drag.type === "section") {
      const sectionTarget = target.closest("[data-itinerary-section-index]");
      if (!sectionTarget) return;
      drag.toIndex = Number(sectionTarget.dataset.itinerarySectionIndex);
    } else {
      const rowTarget = target.closest("[data-itinerary-row-index]");
      if (!rowTarget) return;
      const sectionIndex = Number(rowTarget.dataset.itineraryRowSectionIndex);
      if (sectionIndex !== drag.sectionIndex) return;
      drag.toIndex = Number(rowTarget.dataset.itineraryRowIndex);
    }
  };

  const endTouchDrag = () => {
    const drag = touchDragRef.current;
    if (!drag) return;
    if (drag.type === "section" && drag.fromIndex !== drag.toIndex) {
      onReorderSections(drag.fromIndex, drag.toIndex);
    }
    if (drag.type === "row" && drag.fromIndex !== drag.toIndex) {
      onReorderRows(drag.sectionIndex, drag.fromIndex, drag.toIndex);
    }
    touchDragRef.current = null;
    setDraggingSectionIndex(null);
    setDraggingRow(null);
  };

  const requestDelete = (config) => setConfirmDelete(config);

  const handleConfirmDelete = async () => {
    if (!confirmDelete?.onConfirm) return;
    await confirmDelete.onConfirm();
    setConfirmDelete(null);
  };

  return (
    <>
      <Card className="itinerary-editor-card">
        <Card.Body>
          <div className="itinerary-info-heading">
            <div>
              <div className="fw-semibold">Customer / event info</div>
              <div className="text-muted small">
                Basic details for this itinerary
              </div>
            </div>
            <Button
              size="sm"
              variant={editingInfo ? "primary" : "outline-secondary"}
              onClick={editingInfo ? finishInfoEditing : startInfoEditing}
            >
              {editingInfo ? "Done editing info" : "Edit info"}
            </Button>
          </div>

          {editingInfo ? (
            <div className="itinerary-meta-grid mt-3">
              <Form.Group>
                <Form.Label>Name</Form.Label>
                <Form.Control
                  value={infoDraft?.name || ""}
                  onChange={(e) =>
                    setInfoDraft((current) => ({
                      ...(current || makeInfoDraft()),
                      name: e.target.value,
                    }))
                  }
                />
              </Form.Group>
              <Form.Group>
                <Form.Label>Event type</Form.Label>
                <Form.Control
                  value={infoDraft?.eventType || ""}
                  onChange={(e) =>
                    setInfoDraft((current) => ({
                      ...(current || makeInfoDraft()),
                      eventType: e.target.value,
                    }))
                  }
                />
              </Form.Group>
              <InputGroup>
                <InputGroup.Text>MM</InputGroup.Text>
                <Form.Control
                  value={infoDraft?.month || ""}
                  onChange={(e) =>
                    setInfoDraft((current) => ({
                      ...(current || makeInfoDraft()),
                      month: e.target.value,
                    }))
                  }
                />
                <InputGroup.Text>DD</InputGroup.Text>
                <Form.Control
                  value={infoDraft?.day || ""}
                  onChange={(e) =>
                    setInfoDraft((current) => ({
                      ...(current || makeInfoDraft()),
                      day: e.target.value,
                    }))
                  }
                />
                <InputGroup.Text>YYYY</InputGroup.Text>
                <Form.Control
                  value={infoDraft?.year || ""}
                  onChange={(e) =>
                    setInfoDraft((current) => ({
                      ...(current || makeInfoDraft()),
                      year: e.target.value,
                    }))
                  }
                />
              </InputGroup>
            </div>
          ) : (
            <div className="itinerary-info-grid mt-3">
              <div>
                <span>Name</span>
                <strong>{itinerary.name || "Not set"}</strong>
              </div>
              <div>
                <span>Event type</span>
                <strong>{itinerary.eventType || "Not set"}</strong>
              </div>
              <div>
                <span>Date</span>
                <strong>
                  {[date.month, date.day, date.year].filter(Boolean).join("/") ||
                    "Not set"}
                </strong>
              </div>
            </div>
          )}
        </Card.Body>
      </Card>

      <div className="itinerary-editor-toolbar">
        <Button
          size="sm"
          variant={reorderingSections ? "primary" : "outline-secondary"}
          onClick={toggleSectionReorder}
        >
          {reorderingSections
            ? "Done rearranging sections"
            : "Rearrange sections"}
        </Button>
      </div>

      <div className="itinerary-section-list">
        {(itinerary.sections || []).map((section, sectionIndex) => {
          const isEditingFields = Boolean(editingFields[sectionIndex]);
          const draft = getSectionDraft(section, sectionIndex);
          const visibleFields = isEditingFields
            ? draft.fields
            : section.fields || [];
          const isCollapsed = Boolean(
            collapsedSections[sectionKey(section, sectionIndex)]
          );
          const isReorderingRows = Boolean(reorderingRows[sectionIndex]);

          return (
            <Card
              key={`section-${sectionIndex}`}
              data-itinerary-section-index={sectionIndex}
              className={`itinerary-editor-card ${
                reorderingSections ? "itinerary-drag-card" : ""
              } ${
                draggingSectionIndex === sectionIndex ? "is-dragging" : ""
              }`}
              draggable={reorderingSections}
              onDragStart={(e) => {
                if (!reorderingSections) return;
                setDraggingSectionIndex(sectionIndex);
                e.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={(e) => {
                if (reorderingSections) e.preventDefault();
              }}
              onDrop={(e) => {
                if (!reorderingSections) return;
                e.preventDefault();
                dropSection(sectionIndex);
              }}
              onDragEnd={() => setDraggingSectionIndex(null)}
              onTouchStart={(e) => {
                if (e.target.closest("[data-itinerary-row-index]")) return;
                startTouchSectionDrag(sectionIndex);
              }}
              onTouchMove={moveTouchDrag}
              onTouchEnd={endTouchDrag}
              onTouchCancel={endTouchDrag}
            >
              <Card.Body>
                <div className="itinerary-section-heading">
                  <Form.Control
                    value={isEditingFields ? draft.title : section.title || ""}
                    className="itinerary-section-title"
                    readOnly={!isEditingFields}
                    onChange={(e) =>
                      updateSectionDraft(sectionIndex, (current) => ({
                        ...current,
                        title: e.target.value,
                      }))
                    }
                  />
                  <div className="itinerary-section-actions">
                    <Button
                      size="sm"
                      variant="outline-secondary"
                      onClick={() => toggleSection(section, sectionIndex)}
                      aria-expanded={!isCollapsed}
                    >
                      {isCollapsed ? "Expand" : "Collapse"}
                    </Button>
                    <Button
                      size="sm"
                      variant={isReorderingRows ? "primary" : "outline-secondary"}
                      onClick={() => toggleRowReorder(sectionIndex)}
                    >
                      {isReorderingRows
                        ? "Done rearranging rows"
                        : "Rearrange rows"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline-secondary"
                      onClick={() => toggleFieldEditing(section, sectionIndex)}
                    >
                      {isEditingFields ? "Done editing fields" : "Edit fields"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline-primary"
                      onClick={() => handleAddField(section, sectionIndex)}
                    >
                      + Field
                    </Button>
                    <Button
                      size="sm"
                      variant="outline-danger"
                      onClick={() =>
                        requestDelete({
                          title: "Delete section?",
                          message: `This will delete the "${
                            section.title || "Untitled"
                          }" section and every row inside it.`,
                          confirmText: "Delete section",
                          onConfirm: () => onDeleteSection(sectionIndex),
                        })
                      }
                    >
                      Delete section
                    </Button>
                  </div>
                </div>

                {isCollapsed ? (
                  <div className="itinerary-section-collapsed">
                    {(section.items || []).length} rows hidden
                  </div>
                ) : (
                  <>
                    {reorderingSections ? (
                      <div className="itinerary-reorder-hint">
                        Drag this section to a new position.
                      </div>
                    ) : null}
                    <div className="itinerary-field-strip">
                      {visibleFields.map((field, fieldIndex) =>
                        isEditingFields ? (
                          <InputGroup
                            key={`field-draft-${sectionIndex}-${fieldIndex}`}
                            size="sm"
                          >
                            <Form.Control
                              value={field}
                              onChange={(e) =>
                                updateSectionDraft(sectionIndex, (current) => {
                                  const fields = [...current.fields];
                                  fields[fieldIndex] = e.target.value;
                                  return { ...current, fields };
                                })
                              }
                            />
                            <Button
                              variant="outline-danger"
                              onClick={() =>
                                requestDelete({
                                  title: "Delete field?",
                                  message: `This will delete the "${field}" field from every row in this section.`,
                                  confirmText: "Delete field",
                                  onConfirm: () =>
                                    handleDeleteFieldDraft(
                                      section,
                                      sectionIndex,
                                      fieldIndex
                                    ),
                                })
                              }
                            >
                              x
                            </Button>
                          </InputGroup>
                        ) : (
                          <span
                            key={`field-chip-${sectionIndex}-${fieldIndex}`}
                            className="itinerary-field-chip"
                          >
                            {field}
                          </span>
                        )
                      )}
                    </div>

                    {isReorderingRows ? (
                      <div className="itinerary-reorder-hint">
                        Drag rows inside this section to reorder them.
                      </div>
                    ) : null}

                    <div className="itinerary-row-list">
                      {(section.items || []).map((row, rowIndex) => {
                        const currentRowKey = rowKey(sectionIndex, rowIndex);
                        const isEditingRow = Boolean(editingRows[currentRowKey]);
                        const rowDraft =
                          rowDrafts[currentRowKey] ||
                          makeRowDraft(row, section.fields || []);

                        return (
                          <Card
                            key={rowIndex}
                            data-itinerary-row-section-index={sectionIndex}
                            data-itinerary-row-index={rowIndex}
                            className={`itinerary-row-card ${
                              isReorderingRows ? "itinerary-drag-card" : ""
                            } ${
                              draggingRow?.sectionIndex === sectionIndex &&
                              draggingRow?.rowIndex === rowIndex
                                ? "is-dragging"
                                : ""
                            }`}
                            draggable={isReorderingRows}
                            onDragStart={(e) => {
                              if (!isReorderingRows) return;
                              setDraggingRow({ sectionIndex, rowIndex });
                              e.dataTransfer.effectAllowed = "move";
                            }}
                            onDragOver={(e) => {
                              if (isReorderingRows) e.preventDefault();
                            }}
                            onDrop={(e) => {
                              if (!isReorderingRows) return;
                              e.preventDefault();
                              dropRow(sectionIndex, rowIndex);
                            }}
                            onDragEnd={() => setDraggingRow(null)}
                            onTouchStart={(e) => {
                              e.stopPropagation();
                              startTouchRowDrag(sectionIndex, rowIndex);
                            }}
                            onTouchMove={moveTouchDrag}
                            onTouchEnd={endTouchDrag}
                            onTouchCancel={endTouchDrag}
                          >
                            <Card.Body
                              onBlur={(e) => {
                                if (
                                  isEditingRow &&
                                  !e.currentTarget.contains(e.relatedTarget)
                                ) {
                                  finishRowEditing(
                                    section,
                                    sectionIndex,
                                    rowIndex
                                  );
                                }
                              }}
                            >
                              <div className="itinerary-row-grid">
                                {(section.fields || []).map((field) =>
                                  isEditingRow ? (
                                    <Form.Group key={field}>
                                      <Form.Label>{field}</Form.Label>
                                      <Form.Control
                                        value={rowDraft[field] || ""}
                                        onChange={(e) =>
                                          updateRowDraft(
                                            section,
                                            sectionIndex,
                                            rowIndex,
                                            field,
                                            e.target.value
                                          )
                                        }
                                      />
                                    </Form.Group>
                                  ) : (
                                    <div className="itinerary-row-value" key={field}>
                                      <span>{field}</span>
                                      <strong>{row[field] || "-"}</strong>
                                    </div>
                                  )
                                )}
                              </div>
                              <div className="itinerary-row-actions">
                                <Button
                                  size="sm"
                                  variant={
                                    isEditingRow
                                      ? "primary"
                                      : "outline-secondary"
                                  }
                                  onClick={() =>
                                    isEditingRow
                                      ? finishRowEditing(
                                          section,
                                          sectionIndex,
                                          rowIndex
                                        )
                                      : startRowEditing(
                                          section,
                                          sectionIndex,
                                          rowIndex
                                        )
                                  }
                                >
                                  {isEditingRow ? "Done editing" : "Edit row"}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline-danger"
                                  onClick={() =>
                                    requestDelete({
                                      title: "Delete row?",
                                      message:
                                        "This will delete this row from the itinerary section.",
                                      confirmText: "Delete row",
                                      onConfirm: () =>
                                        onDeleteRow(sectionIndex, rowIndex),
                                    })
                                  }
                                >
                                  Delete row
                                </Button>
                              </div>
                            </Card.Body>
                          </Card>
                        );
                      })}
                    </div>

                    <Button
                      size="sm"
                      variant="outline-primary"
                      className="mt-3"
                      onClick={() =>
                        handleAddRow(
                          section,
                          sectionIndex,
                          (section.items || []).length
                        )
                      }
                    >
                      + Add Row
                    </Button>
                  </>
                )}
              </Card.Body>
            </Card>
          );
        })}
      </div>

      <Button className="my-3" variant="primary" onClick={onAddSection}>
        + Add Section
      </Button>
      <Button
        className="my-3 ms-2"
        variant="outline-primary"
        onClick={() => setShowImport(true)}
      >
        Paste section
      </Button>
      <ConfirmDeleteModal
        show={Boolean(confirmDelete)}
        title={confirmDelete?.title}
        message={confirmDelete?.message}
        confirmText={confirmDelete?.confirmText}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={handleConfirmDelete}
      />
      <ImportSectionModal
        show={showImport}
        onCancel={() => setShowImport(false)}
        onImport={(importConfig) => {
          onImportText(importConfig);
          setShowImport(false);
        }}
      />
    </>
  );
}

function ImportSectionModal({ show, onCancel, onImport }) {
  const [sectionType, setSectionType] = useState("generic");
  const [sectionTitle, setSectionTitle] = useState(
    SECTION_TYPES.generic.defaultTitle
  );
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (show) {
      setSectionType("generic");
      setSectionTitle(SECTION_TYPES.generic.defaultTitle);
      setText("");
      setError("");
    }
  }, [show]);

  const handleTypeChange = (nextType) => {
    setSectionType(nextType);
    setSectionTitle(SECTION_TYPES[nextType]?.defaultTitle || "");
    setError("");
  };

  const handleImport = () => {
    if (!sectionTitle.trim()) {
      setError("Add a section name before importing.");
      return;
    }
    const parsed = parseSectionImport({
      sectionType,
      sectionTitle: sectionTitle.trim(),
      content: text,
    });
    if (!parsed.parsedRows.length) {
      setError("Paste a section and content before importing.");
      return;
    }
    onImport({ sectionType, sectionTitle: sectionTitle.trim(), content: text });
  };

  const placeholder =
    sectionType === "timeline"
      ? "4:15pm: Lunch, Note: Start immediately\n5:00pm: Guest arrival"
      : sectionType === "contact"
      ? "Contact name, Title or role, phone or email\nContact name, Title or role, phone or email"
      : "Item name\nItem name, Note: Add an optional note";

  return (
    <Modal show={show} onHide={onCancel} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Paste section</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Alert variant="warning">
          Importing will replace the rows in the matching section. Any existing
          rows in that section that are not included in your pasted text will be
          removed.
        </Alert>
        <div className="itinerary-import-grid">
          <Form.Group>
            <Form.Label>Section type</Form.Label>
            <Form.Select
              value={sectionType}
              onChange={(e) => handleTypeChange(e.target.value)}
            >
              <option value="generic">Generic section</option>
              <option value="timeline">Timeline section</option>
              <option value="contact">Contact list</option>
            </Form.Select>
          </Form.Group>
          <Form.Group>
            <Form.Label>Section name</Form.Label>
            <Form.Control
              value={sectionTitle}
              onChange={(e) => {
                setSectionTitle(e.target.value);
                setError("");
              }}
              placeholder="Section name"
            />
          </Form.Group>
        </div>
        <Form.Group>
          <Form.Label>Content</Form.Label>
          <Form.Control
            as="textarea"
            rows={12}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setError("");
            }}
            placeholder={placeholder}
          />
          <Form.Text muted>
            Generic sections use one row per line. Timeline sections use
            time/details rows. Contact lists use name, title, contact.
          </Form.Text>
        </Form.Group>
        {error ? (
          <Alert variant="warning" className="mt-3 mb-0">
            {error}
          </Alert>
        ) : null}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="warning" onClick={handleImport}>
          Replace section rows
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

function ConfirmDeleteModal({
  show,
  title,
  message,
  confirmText = "Delete",
  onCancel,
  onConfirm,
}) {
  return (
    <Modal show={show} onHide={onCancel} centered>
      <Modal.Header closeButton>
        <Modal.Title>{title || "Confirm delete"}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="mb-0">{message || "This action cannot be undone."}</p>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm}>
          {confirmText}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
