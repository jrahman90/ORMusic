import React from "react";
import { Button, Card, Container } from "react-bootstrap";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import db from "../../api/firestore/firestore"; // Assuming you have initialized the Firebase app and obtained the 'db' and 'auth' instances
import PreviousInquiries from "./PreviousInquiries";

const Cart = ({ items, setItems }) => {
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
    try {
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        console.log("User not logged in");
        return;
      }

      // Create a new document in Firestore
      const inquiriesRef = collection(db, "inquiries");

      // Add the cart items, user ID, and timestamp to the 'inquiries' collection
      await addDoc(inquiriesRef, {
        items: items,
        userId: user.uid,
        timestamp: serverTimestamp(),
      });

      // Clear the cart items
      setItems([]);

      console.log("Inquiry sent successfully");
    } catch (error) {
      console.error("Error sending inquiry:", error);
    }
  };

  return (
    <Container>
      <h2>Cart</h2>
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
        disabled={items.length === 0}
      >
        Send Inquiry
      </Button>
      {<PreviousInquiries />}
    </Container>
  );
};

export default Cart;
