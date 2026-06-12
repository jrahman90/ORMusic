import React, { useMemo } from "react";
import { Alert, Badge, Button, Card } from "react-bootstrap";
import { Link } from "react-router-dom";
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

export default function InquiryItineraries({ inquiry }) {
  const events = useMemo(() => normalizeEvents(inquiry?.events), [inquiry]);
  const canUseItineraries = isConfirmed(inquiry?.status);

  if (!inquiry?.id) return null;

  return (
    <div className="itinerary-panel mt-3">
      <div className="d-flex align-items-center justify-content-between gap-2 mb-2">
        <div className="fw-semibold">Itineraries</div>
        <Badge bg={canUseItineraries ? "success" : "secondary"}>
          {canUseItineraries ? "Confirmed" : "Locked"}
        </Badge>
      </div>

      {!canUseItineraries ? (
        <Alert variant="light" className="border mb-0">
          Itineraries become available once this inquiry is confirmed.
        </Alert>
      ) : events.length === 0 ? (
        <Alert variant="light" className="border mb-0">
          Add event dates before creating itineraries.
        </Alert>
      ) : (
        <div className="itinerary-card-list">
          {events.map((event) => (
            <Card key={event.id} className="itinerary-card">
              <Card.Body className="itinerary-launch-card">
                <div>
                  <div className="fw-semibold">{eventLabel(event)}</div>
                  <div className="text-muted small">
                    {event.itinerary
                      ? "Itinerary started"
                      : "No itinerary created yet"}
                  </div>
                </div>
                <div className="itinerary-launch-actions">
                  {event.itinerary ? (
                    <Button
                      as={Link}
                      to={`/inquiries/${inquiry.id}/events/${event.id}/itinerary/print`}
                      size="sm"
                      variant="outline-secondary"
                    >
                      View PDF
                    </Button>
                  ) : null}
                  <Button
                    as={Link}
                    to={`/inquiries/${inquiry.id}/events/${event.id}/itinerary`}
                    size="sm"
                    variant={event.itinerary ? "outline-primary" : "primary"}
                  >
                    {event.itinerary ? "Open itinerary" : "Create itinerary"}
                  </Button>
                </div>
              </Card.Body>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
