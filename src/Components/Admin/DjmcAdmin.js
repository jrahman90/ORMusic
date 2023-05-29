import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Button, Image } from 'react-bootstrap';
import  db  from '../../api/firestore/firestore'; 
import { storage } from '../../api/firestore/firestore';
import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 } from 'uuid';


const DjmcAdmin = () => {
  const [users, setUsers] = useState([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState(null);

  useEffect(() => {
    // Fetch users from Firestore
    const fetchUsers = async () => {
      const usersCollection = collection(db, 'users');
      const usersSnapshot = await getDocs(usersCollection);
      const usersData = usersSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setUsers(usersData);
    };

    fetchUsers();
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setImage(file);
  };

  const handleAddUser = async (e) => {
    e.preventDefault();

    // Upload image to Firebase Storage
    const storageRef = ref(storage, `images/${image.name + v4()}`);
    await uploadBytes(storageRef, image);

    // Get the image URL from Firebase Storage
    const imageUrl = await getDownloadURL(storageRef);

    // Add user data to Firestore
    const newUser = { name, description, imageUrl };
    await addDoc(collection(db, 'users'), newUser);

    // Clear form fields
    setName('');
    setDescription('');
    setImage(null);

    // Update the users state with the new user
    setUsers((prevUsers) => [...prevUsers, { id: '', ...newUser }]);
  };

  const handleDeleteUser = async (userId) => {
    // Delete user from Firestore
    await deleteDoc(doc(db, 'users', userId));

    // Update the users state by removing the deleted user
    setUsers((prevUsers) => prevUsers.filter((user) => user.id !== userId));
  };

  return (
    <Container className='
    my-3'>
      <Row>
        {users.map((user, index) => (
            <Row key={user.id} className={index % 2 === 0 ? 'flex-row' : 'flex-row-reverse'}>
            <Col sm={12} md={6} className="d-flex align-items-center">
              <Image src={user.imageUrl} roundedCircle fluid />
            </Col>
            <Col sm={12} md={6} className="d-flex align-items-center justify-content-center" style={{textAlign:'center'}}>
              <div>
                <h2>{user.name}</h2>
                <p>{user.description}</p>
                <Button variant="danger" onClick={() => handleDeleteUser(user.id)}>
                  Delete
                </Button>
              </div>
            </Col>
          </Row>
        ))}
      </Row>

      <Form onSubmit={handleAddUser} className='pe-3 pb-3 pt-3'>
        <Form.Group className="mb-3">
          <Form.Label>Name</Form.Label>
          <Form.Control type="text" value={name} onChange={(e) => setName(e.target.value)} />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Description</Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Image</Form.Label>
          <Form.Control type="file" onChange={handleImageChange} />
        </Form.Group>

        <Button variant="primary" type="submit">
          Add User
        </Button>
      </Form>
    </Container>
  );
};

export default DjmcAdmin;
