import React, { useState, useEffect } from 'react';
import { Button, Card, Container } from 'react-bootstrap';
import { collection, getDocs } from 'firebase/firestore';
import db from '../../api/firestore/firestore';

const Rentals = ({ addToCart }) => {
  const [rentals, setRentals] = useState([]);

  useEffect(() => {
    // Fetch rental items from Firestore on component mount
    const fetchRentals = async () => {
      try {
        const rentalsCollectionRef = collection(db, 'rentals');
        const rentalsSnapshot = await getDocs(rentalsCollectionRef);
        const rentalsData = rentalsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setRentals(rentalsData);
      } catch (error) {
        console.error('Error fetching rentals:', error);
      }
    };

    fetchRentals();
  }, []);

  const handleAddToCart = (item) => {
    addToCart(item);
  };

  return (
    <Container>
      <h2>Rentals</h2>
      {rentals.length === 0 ? (
        <p>No rental items available</p>
      ) : (
        rentals.map((item) => (
          <Card key={item.id} style={{ marginBottom: '1rem' }}>
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
