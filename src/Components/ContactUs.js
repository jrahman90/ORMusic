import React, { useEffect, useRef, useState } from "react";
import emailjs from "@emailjs/browser";
import {
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  Mail,
  MessageSquareText,
  Phone,
  Send,
  Sparkles,
} from "lucide-react";
import {
  Button,
  Col,
  Container,
  Form,
  Row,
  Spinner,
  Toast,
  ToastContainer,
} from "react-bootstrap";
import { Link } from "react-router-dom";
import "./Css/contactForm.css";

const initialToast = {
  show: false,
  message: "",
  title: "",
  variant: "success",
};

export default function ContactUs() {
  const [toast, setToast] = useState(initialToast);
  const [isSending, setIsSending] = useState(false);
  const form = useRef();

  useEffect(() => {
    if (!toast.show) return undefined;
    const timer = window.setTimeout(
      () => setToast((current) => ({ ...current, show: false })),
      4500
    );
    return () => window.clearTimeout(timer);
  }, [toast.show]);

  const showToast = ({ title, message, variant = "success" }) => {
    setToast({ show: true, title, message, variant });
  };

  const sendEmail = (event) => {
    event.preventDefault();
    if (isSending) return;

    setIsSending(true);
    emailjs
      .sendForm(
        "service_pimfhg7",
        "template_98bu8bi",
        form.current,
        "sV1cKQAbOd4PLkl38"
      )
      .then(
        () => {
          showToast({
            title: "Message sent",
            message: "Thanks for reaching out. We will get back to you soon.",
          });
          form.current.reset();
        },
        (error) => {
          console.error("Contact form failed:", error);
          showToast({
            title: "Message not sent",
            message: "Please try again, or start from Services for event inquiries.",
            variant: "danger",
          });
        }
      )
      .finally(() => {
        setIsSending(false);
      });
  };

  return (
    <main className="contact-page">
      <section
        className="contact-hero"
        style={{ "--contact-hero-image": "url('/djbooth3.jpg')" }}
      >
        <Container className="contact-hero-inner">
          <div className="contact-hero-copy">
            <span>
              <MessageSquareText size={17} />
              Contact OR Music Events
            </span>
            <h1>Questions, support, and collaboration</h1>
            <p>
              For event pricing and availability, start with Services so your
              inquiry includes the package, rentals, and details we need.
            </p>
            <div className="contact-hero-actions">
              <Button as={Link} to="/RentalItems" size="lg">
                Explore services
                <ArrowRight size={18} />
              </Button>
              <Button as={Link} to="/Cart" variant="outline-light" size="lg">
                View cart
              </Button>
            </div>
          </div>
        </Container>
      </section>

      <Container className="contact-content">
        <Row className="g-4 align-items-start">
          <Col lg={5}>
            <section className="contact-routing-panel">
              <span className="contact-kicker">Best next step</span>
              <h2>Booking an event?</h2>
              <p>
                Build your request from Services first. That keeps packages,
                add-ons, pricing, discounts, and event details connected to the
                inquiry.
              </p>
              <Button as={Link} to="/RentalItems">
                Start with services
                <ArrowRight size={16} />
              </Button>

              <div className="contact-info-list" aria-label="Contact details">
                <a href="mailto:bookings@ormusicevents.com">
                  <Mail size={19} />
                  <span>
                    <strong>Email</strong>
                    bookings@ormusicevents.com
                  </span>
                </a>
                <a href="tel:+13475333375">
                  <Phone size={19} />
                  <span>
                    <strong>Phone</strong>
                    (347) 533-3375
                  </span>
                </a>
              </div>
            </section>

            <section className="contact-note-panel">
              <div>
                <CalendarCheck size={20} />
                <span>Event inquiries</span>
              </div>
              <p>
                General messages are welcome here. For dates, deposits,
                packages, contracts, and schedules, use the Services and Cart
                flow.
              </p>
            </section>
          </Col>

          <Col lg={7}>
            <section className="contact-form-panel">
              <div className="contact-form-heading">
                <span className="contact-kicker">General message</span>
                <h2>Send a note</h2>
                <p>Partnerships, support, media, and non-booking questions.</p>
              </div>

              <Form ref={form} onSubmit={sendEmail} className="contact-form">
                <fieldset disabled={isSending}>
                  <Row className="g-3">
                    <Col md={6}>
                      <Form.Group controlId="contactName">
                        <Form.Label>Name</Form.Label>
                        <Form.Control
                          type="text"
                          name="user_name"
                          placeholder="Your name"
                          required
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group controlId="contactEmail">
                        <Form.Label>Email</Form.Label>
                        <Form.Control
                          type="email"
                          name="user_email"
                          placeholder="you@example.com"
                          required
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group controlId="contactPhone">
                        <Form.Label>Phone</Form.Label>
                        <Form.Control
                          type="tel"
                          name="user_phone"
                          placeholder="(347) 533-3375"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group controlId="contactTopic">
                        <Form.Label>Topic</Form.Label>
                        <Form.Select name="message_topic" defaultValue="General">
                          <option>General</option>
                          <option>Support</option>
                          <option>Partnership</option>
                          <option>Media</option>
                          <option>Other</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col xs={12}>
                      <Form.Group controlId="contactMessage">
                        <Form.Label>Message</Form.Label>
                        <Form.Control
                          as="textarea"
                          name="message"
                          placeholder="How can we help?"
                          rows={6}
                          required
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                </fieldset>

                <div className="contact-form-footer">
                  <div>
                    <CheckCircle2 size={18} />
                    <span>Event requests belong in Services and Cart.</span>
                  </div>
                  <Button type="submit" disabled={isSending}>
                    {isSending ? (
                      <>
                        <Spinner
                          as="span"
                          animation="border"
                          aria-hidden="true"
                          className="me-2"
                          role="status"
                          size="sm"
                        />
                        Sending
                      </>
                    ) : (
                      <>
                        <Send size={16} />
                        Send message
                      </>
                    )}
                  </Button>
                </div>
              </Form>
            </section>
          </Col>
        </Row>
      </Container>

      <section className="contact-service-band">
        <Container className="contact-service-inner">
          <div>
            <span className="contact-kicker">
              <Sparkles size={16} />
              Plan the right setup
            </span>
            <h2>Packages, add-ons, and event production live in Services.</h2>
          </div>
          <Button as={Link} to="/RentalItems" variant="light">
            Browse services
            <ArrowRight size={16} />
          </Button>
        </Container>
      </section>

      <ToastContainer className="contact-toast-container">
        <Toast
          autohide
          className={`contact-toast contact-toast-${toast.variant}`}
          delay={4500}
          onClose={() => setToast((current) => ({ ...current, show: false }))}
          show={toast.show}
        >
          <Toast.Header>
            <strong className="me-auto">{toast.title}</strong>
          </Toast.Header>
          <Toast.Body>{toast.message}</Toast.Body>
        </Toast>
      </ToastContainer>
    </main>
  );
}
