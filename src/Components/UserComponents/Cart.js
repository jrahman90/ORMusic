import React, { useState, useEffect } from "react";
import {
  Alert,
  Button,
  Card,
  Container,
  Form,
  InputGroup,
} from "react-bootstrap";
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import db from "../../api/firestore/firestore"; // Assuming you have initialized the Firebase app and obtained the 'db' and 'auth' instances
import PreviousInquiries from "./PreviousInquiries";
import Modal from "react-bootstrap/Modal";

const Cart = ({ items, setItems }) => {
  const [show, setShow] = useState(false);
  const [successMessage, setSuccessMessage] = useState(false);
  const [eventDetails, setEventDetails] = useState("");
  const [userData, setUserData] = useState({});

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  const handleQuantityToggle = (item, increment) => {
    const updatedItems = items.map((cartItem) => {
      if (cartItem.id === item.id) {
        const newQuantity = increment
          ? cartItem.quantity + 1
          : cartItem.quantity - 1;
        return { ...cartItem, quantity: newQuantity >= 0 ? newQuantity : 0 };
      }
      return cartItem;
    });

    setItems(updatedItems);
    localStorage.setItem("cartItems", JSON.stringify(updatedItems));
  };

  const handleDeleteItem = (itemId) => {
    const updatedItems = items.filter((item) => item.id !== itemId);
    setItems(updatedItems);
    localStorage.setItem("cartItems", JSON.stringify(updatedItems));
  };

  const handleInquiry = async () => {
    const auth = getAuth();
    const user = auth.currentUser;

    try {
      if (!user) {
        handleShow();
        return;
      }

      // Create a new document in Firestore
      const inquiriesRef = collection(db, "inquiries");

      // Add the cart items, user ID, and timestamp to the 'inquiries' collection
      await addDoc(inquiriesRef, {
        items: items,
        userId: user.uid,
        timestamp: serverTimestamp(),
        eventDetails,
        phoneNumber: userData.phoneNumber,
        name: userData.name,
        email: user.email,
        status: "Processing",
      });

      // Clear the cart items
      setItems([]);

      setSuccessMessage(true);
      setTimeout(() => {
        setSuccessMessage(false);
      }, 3000);
    } catch (error) {
      console.error("Error sending inquiry:", error);
    }
  };

  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;

    if (user) {
      const userRef = doc(db, "users", user?.uid);
      getDoc(userRef).then((doc) => {
        setUserData(doc.data());
      });
      console.log("num", userData.phoneNumber);
    }
  }, []);

  return (
    <Container>
      <h2>Cart</h2>
      {items.length > 0 ? (
        <Form style={{ marginBottom: "1rem" }}>
          <InputGroup>
            <InputGroup.Text>Event Details</InputGroup.Text>
            <Form.Control
              as="textarea"
              aria-label="With textarea"
              onChange={(e) => {
                setEventDetails(e.target.value);
              }}
            />
          </InputGroup>
          <Form.Text id="passwordHelpBlock" muted>
            Provide details on the type of event, venue, date and time.
            Additionally, please specify the most convenient time for us to
            reach out to you regarding your inquiry.
          </Form.Text>
          {eventDetails.length < 20 ? (
            <Alert style={{ marginTop: "1rem" }} variant="danger">
              Not enough details to submit an inquiry. Minimum 20 characters.
            </Alert>
          ) : (
            ""
          )}
        </Form>
      ) : (
        ""
      )}
      {items.length === 0 ? (
        <p>No items in cart</p>
      ) : (
        items.map((item) => (
          <Card key={item.id} style={{ marginBottom: "1rem" }}>
            <Card.Body>
              <Card.Title>{item.name}</Card.Title>
              <Card.Text>Quantity: {item.quantity}</Card.Text>
              <Button
                variant="secondary"
                onClick={() => handleQuantityToggle(item, true)}
              >
                +
              </Button>{" "}
              <Button
                variant="secondary"
                onClick={() => handleQuantityToggle(item, false)}
              >
                -
              </Button>{" "}
              <Button
                variant="danger"
                onClick={() => handleDeleteItem(item.id)}
              >
                Delete
              </Button>
            </Card.Body>
          </Card>
        ))
      )}
      <Button
        variant="primary"
        onClick={handleInquiry}
        disabled={items.length === 0 || eventDetails.length < 20}
      >
        Send Inquiry
      </Button>
      {items.length === 0 ? (
        <Alert style={{ marginTop: "1rem" }} variant="danger">
          Add something to the cart to send an inquiry.
        </Alert>
      ) : (
        ""
      )}
      {successMessage ? (
        <Alert style={{ marginTop: "1rem" }} variant="success">
          Your request was sent successfully! Someone from our team will reach
          out to you soon.
        </Alert>
      ) : (
        ""
      )}
      <div className="line"></div>
      {<PreviousInquiries />}
      <Modal
        show={show}
        onHide={handleClose}
        backdrop="static"
        keyboard={false}
      >
        <Modal.Header closeButton>
          <Modal.Title>uh oh ... </Modal.Title>
        </Modal.Header>
        <Modal.Body>Please sign in to submit an inquiry.</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default Cart;
