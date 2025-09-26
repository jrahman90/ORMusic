import React, { useRef, useState } from "react";
import emailjs from "@emailjs/browser";
import { Alert, Spinner } from "react-bootstrap";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import "./Css/contactForm.css";

export default function ContactUs() {
  const [show, setShow] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const form = useRef();

  const sendEmail = (e) => {
    e.preventDefault();
    if (isSending) return; // prevent double submit

    setIsSending(true);
    emailjs
      .sendForm(
        "service_pimfhg7",
        "template_98bu8bi",
        form.current,
        "sV1cKQAbOd4PLkl38"
      )
      .then(
        (result) => {
          console.log(result.text);
          setShow(true);
          form.current.reset(); // clear fields

          // auto-hide after 3 seconds
          setTimeout(() => {
            setShow(false);
          }, 3000);
        },
        (error) => {
          console.log(error.text);
        }
      )
      .finally(() => {
        setIsSending(false);
      });
  };

  return (
    <div
      className="justify-content-center align-items-center"
      style={{ padding: 20 }}
    >
      {/* Professional notice about proper flow for event requests */}
      <Alert variant="light" className="border mb-3">
        <div className="fw-semibold">Before you send a message:</div>
        This form is for general questions, partnerships, support, or other non
        booking requests. To request an event, go to the{" "}
        <a href="/RentalItems" className="text-decoration-underline">
          Services
        </a>{" "}
        tab, add the items you need to your cart, then submit your inquiry from
        the Cart.
      </Alert>

      <Form
        className="mb-3"
        ref={form}
        onSubmit={sendEmail}
        style={{ padding: 10 }}
      >
        {/* Disable all inputs while sending */}
        <fieldset disabled={isSending}>
          <Form.Group className="mb-3" controlId="formName">
            <Form.Label>Name</Form.Label>
            <Form.Control
              type="text"
              name="user_name"
              placeholder="Enter Name"
            />
          </Form.Group>

          <Form.Group className="mb-3" controlId="formBasicEmail">
            <Form.Label>Email Address</Form.Label>
            <Form.Control
              type="email"
              name="user_email"
              placeholder="Enter Email"
            />
          </Form.Group>

          <Form.Group className="mb-3" controlId="formPhone">
            <Form.Label>Phone Number</Form.Label>
            <Form.Control
              type="tel"
              name="user_phone"
              placeholder="(999) 999 9999"
            />
          </Form.Group>

          <Form.Group className="mb-3" controlId="formMessage">
            <Form.Label>Message</Form.Label>
            <Form.Control
              as="textarea"
              name="message"
              placeholder="Share your question or comment. For event requests, please use the Services tab and send an inquiry from your cart."
              rows={4}
            />
            <Form.Text className="text-muted">
              Event bookings are handled through Services and the Cart, not this
              form.
            </Form.Text>
          </Form.Group>
        </fieldset>

        <Button type="submit" value="Send" disabled={isSending}>
          {isSending ? (
            <>
              <Spinner
                as="span"
                animation="border"
                size="sm"
                role="status"
                aria-hidden="true"
                className="me-2"
              />
              Sending...
            </>
          ) : (
            "Send Message"
          )}
        </Button>

        {show && (
          <Alert className="mt-3" variant="success">
            Message Sent!
          </Alert>
        )}
      </Form>
    </div>
  );
}
