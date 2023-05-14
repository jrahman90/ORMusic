import React, { useRef, useState } from "react";
import emailjs from "@emailjs/browser";
import { Alert } from "react-bootstrap";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import "./Css/contactForm.css";

export default function ContactUs() {
  const [show, setShow] = useState(false);
  const form = useRef();

  const sendEmail = (e) => {
    e.preventDefault();
    try {
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
          },
          (error) => {
            console.log(error.text);
          }
        );
    } catch (error) {
      console.log(error);
    }
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
        <Form.Group className="mb-3" controlId="formName">
          <Form.Label>Name</Form.Label>
          <Form.Control type="text" name="user_name" placeholder="Enter Name" />
        </Form.Group>

        <Form.Group className="mb-3" controlId="formBasicEmail">
          <Form.Label>Email Address</Form.Label>
          <Form.Control type="email" name="user_email" placeholder="Name" />
        </Form.Group>

        <Form.Group className="mb-3" controlId="formPhone">
          <Form.Label>Phone Number</Form.Label>
          <Form.Control
            type="phone"
            name="user_phone"
            placeholder="(999)999 9999"
          />
        </Form.Group>

        <Form.Group className="mb-3" controlId="formMessage">
          <Form.Label>Message</Form.Label>
          <Form.Control
            as="textarea"
            name="message"
            placeholder="Please enter deatailed information for your inquiry."
          />
        </Form.Group>

        <Button type="submit" value="Send">
          Send Message
        </Button>

        {show ? <Alert variant={"success"}>Message Sent!</Alert> : ""}
      </Form>
    </div>
  );
}
