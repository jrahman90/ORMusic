import React, { useState, useEffect } from "react";
import { Button, Card, Container, Alert } from "react-bootstrap";
import { collection, getDocs } from "firebase/firestore";
import db from "../../api/firestore/firestore";

const Rentals = ({ addToCart }) => {
  const [rentals, setRentals] = useState([]);
  const [addedToCart, setAddedToCart] = useState(false);

  useEffect(() => {
    // Fetch rental items from Firestore on component mount
    const fetchRentals = async () => {
      try {
        const rentalsCollectionRef = collection(db, "rentals");
        const rentalsSnapshot = await getDocs(rentalsCollectionRef);
        const rentalsData = rentalsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setRentals(rentalsData);
      } catch (error) {
        console.error("Error fetching rentals:", error);
      }
    };

    fetchRentals();
  }, []);

  const handleAddToCart = (item) => {
    addToCart(item);
    setAddedToCart(true);
    setTimeout(() => {
      setAddedToCart(false);
    }, 1000);
  };

  return (
    <Container>
      {addedToCart ? <Alert variant="success">Added to Cart!</Alert> : ""}
      <h2>Rentals</h2>
      {rentals.length === 0 ? (
        <p>
          We are diligently curating a selection of captivating items to elevate
          your experience. Kindly revisit us at your convenience for the latest
          updates and additions to our collection.
        </p>
      ) : (
        rentals.map((item) => (
          <Card key={item.id} style={{ marginBottom: "1rem" }}>
            <Card.Body>
              <Card.Title>{item.name}</Card.Title>
              <Card.Text>{item.description}</Card.Text>
              <Button variant="primary" onClick={() => handleAddToCart(item)}>
                Add to Cart
              </Button>
            </Card.Body>
          </Card>
        ))
      )}
    </Container>
  );
};

export default Rentals;
