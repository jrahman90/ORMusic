import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Button, Image, Modal } from 'react-bootstrap';
import  db  from '../../api/firestore/firestore'; 
import { storage } from '../../api/firestore/firestore';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 } from 'uuid';


const DjmcAdmin = () => {
  const [users, setUsers] = useState([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);


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

  //Delete a User

  const handleDeleteUser = (user) => {
    console.log('user',user)
    setUserToDelete(user);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    // Delete user from Firestore
    await deleteDoc(doc(db, 'users', userToDelete.id));
    // Update the users state by removing the deleted user
    setUsers((prevUsers) => prevUsers.filter((user) => user.id !== userToDelete.id));

    // Close the modal and reset userToDelete
    setShowDeleteModal(false);
    setUserToDelete(null);
  };

  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setUserToDelete(null);
  };

  //Edit User
  const handleEditUser = (user) => {
    setEditingUser(user);
    setName(user.name);
    setDescription(user.description);
    // You may also need to handle the image editing if necessary
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    setName('');
    setDescription('');
    // Reset any other necessary fields
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();

    // Update user data in Firestore
    await updateDoc(doc(db, 'users', editingUser.id), {
      name,
      description,
    });

    // Update the user in the users state
    setUsers((prevUsers) =>
      prevUsers.map((user) =>
        user.id === editingUser.id ? { ...user, name, description } : user
      )
    );

    // Clear edit mode and form fields
    setEditingUser(null);
    setName('');
    setDescription('');
    // Reset any other necessary fields
  };

  return (
    <Container className='
    my-3'>
      <h1 className='heading-text'>Meet The Team!</h1>
      <Row>
        {users.map((user, index) => (
            <Row key={user.id} className={index % 2 === 0 ? 'flex-row' : 'flex-row-reverse'}>
            <Col sm={12} md={6} className="d-flex align-items-center">
              <Image src={user.imageUrl} roundedCircle fluid />
            </Col>
            <Col sm={12} md={6} className="d-flex align-items-center justify-content-center" style={{textAlign:'center'}}>
              <div>
                <h2 className='heading-subtext'>{user.name}</h2>
                <p className='paragraph-text'>{user.description}</p>
                {editingUser && editingUser.id === user.id ? (
                  <>
                    <Button variant="primary" onClick={handleUpdateUser}>
                      Update
                    </Button>
                    <Button variant="secondary" onClick={handleCancelEdit}>
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button variant="info" onClick={() => handleEditUser(user)}>
                    Edit
                  </Button>
                )}
                <Button variant="danger" onClick={() => handleDeleteUser(user)}>
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
      {/* Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={handleCloseDeleteModal}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete the user?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseDeleteModal}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleConfirmDelete}>
            Delete
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default DjmcAdmin;
