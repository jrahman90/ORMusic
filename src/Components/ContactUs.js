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
              placeholder="Please enter detailed information for your inquiry."
              rows={4}
            />
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
