import React, { useState, useEffect } from 'react';
import { Button, Card, Container, Form } from 'react-bootstrap';
import { collection, addDoc, doc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore';
import db from '../../api/firestore/firestore';

const RentalsAdmin = () => {
  const [rentals, setRentals] = useState([]);
  const [newRental, setNewRental] = useState({ name: '', description: '' });

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

  const handleAddRental = async (e) => {
    e.preventDefault();

    try {
      const rentalCollectionRef = collection(db, 'rentals');
      const newRentalDocRef = await addDoc(rentalCollectionRef, newRental);
      const newRentalData = { id: newRentalDocRef.id, ...newRental };
      setRentals([...rentals, newRentalData]);
      setNewRental({ name: '', description: '' });
      console.log('Rental added:', newRentalData);
    } catch (error) {
      console.error('Error adding rental:', error);
    }
  };

  const handleDeleteRental = async (id) => {
    try {
      const rentalDocRef = doc(db, 'rentals', id);
      await deleteDoc(rentalDocRef);
      const updatedRentals = rentals.filter((rental) => rental.id !== id);
      setRentals(updatedRentals);
      console.log('Rental deleted:', id);
    } catch (error) {
      console.error('Error deleting rental:', error);
    }
  };

  const handleEditRental = async (id, updatedRental) => {
    try {
      const rentalDocRef = doc(db, 'rentals', id);
      await updateDoc(rentalDocRef, updatedRental);
      const updatedRentals = rentals.map((rental) =>
        rental.id === id ? { ...rental, ...updatedRental } : rental
      );
      setRentals(updatedRentals);
      console.log('Rental edited:', id);
    } catch (error) {
      console.error('Error editing rental:', error);
    }
  };

  return (
    <Container>
      <h2>Admin Rentals</h2>
      <Form onSubmit={handleAddRental}>
        <Form.Group>
          <Form.Label>Name</Form.Label>
          <Form.Control
            type="text"
            value={newRental.name}
            onChange={(e) => setNewRental({ ...newRental, name: e.target.value })}
          />
        </Form.Group>
        <Form.Group>
          <Form.Label>Description</Form.Label>
          <Form.Control
            type="text"
            value={newRental.description}
            onChange={(e) => setNewRental({ ...newRental, description: e.target.value })}
          />
        </Form.Group>
        <Button variant="primary" type="submit">
          Add Rental
        </Button>
      </Form>
      {rentals.length === 0 ? (
        <p>No rental items available</p>
      ) : (
        rentals.map((item) => (
          <Card key={item.id} style={{ marginBottom: '1rem' }}>
            <Card.Body>
              <Card.Title>{item.name}</Card.Title>
              <Card.Text>{item.description}</Card.Text>
              <Button variant="danger" onClick={() => handleDeleteRental(item.id)}>
                Delete
              </Button>{' '}
              <Button
                variant="secondary"
                onClick={() =>
                  handleEditRental(item.id, { name: item.name + ' (edited)', description: item.description })
                }
              >
                Edit
              </Button>
            </Card.Body>
          </Card>
        ))
      )}
    </Container>
  );
};

export default RentalsAdmin;
