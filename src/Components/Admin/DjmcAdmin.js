import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Button, Image, Modal } from 'react-bootstrap';
import  db  from '../../api/firestore/firestore'; 
import { storage } from '../../api/firestore/firestore';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 } from 'uuid';


const DjmcAdmin = () => {
  const [artists, setArtists] = useState([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState(null);
  const [editingartist, setEditingartist] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [artistToDelete, setArtistsToDelete] = useState(null);


  useEffect(() => {
    // Fetch artists from Firestore
    const fetchartists = async () => {
      const artistsCollection = collection(db, 'artists');
      const artistsSnapshot = await getDocs(artistsCollection);
      const artistsData = artistsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setArtists(artistsData);
    };

    fetchartists();
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setImage(file);
  };

  const handleAddartist = async (e) => {
    e.preventDefault();

    // Upload image to Firebase Storage
    const storageRef = ref(storage, `images/${image.name + v4()}`);
    await uploadBytes(storageRef, image);

    // Get the image URL from Firebase Storage
    const imageUrl = await getDownloadURL(storageRef);

    // Add artist data to Firestore
    const newartist = { name, description, imageUrl };
    await addDoc(collection(db, 'artists'), newartist);

    // Clear form fields
    setName('');
    setDescription('');
    setImage(null);

    // Update the artists state with the new artist
    setArtists((prevartists) => [...prevartists, { id: '', ...newartist }]);
  };

  //Delete a artist

  const handleDeleteartist = (artist) => {
    setArtistsToDelete(artist);
    setShowDeleteModal(true);
    console.log('artist',artist)
  };
  
  const handleConfirmDelete = async () => {
    // Delete artist from Firestore
    await deleteDoc(doc(db, 'artists', artistToDelete.id));
    // Update the artists state by removing the deleted artist
    setArtists((prevartists) => prevartists.filter((artist) => artist.id !== artistToDelete.id));

    // Close the modal and reset artistToDelete
    setShowDeleteModal(false);
    setArtistsToDelete(null);
  };

  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setArtistsToDelete(null);
  };

  //Edit artist
  const handleEditartist = (artist) => {
    setEditingartist(artist);
    setName(artist.name);
    setDescription(artist.description);
    // You may also need to handle the image editing if necessary
  };

  const handleCancelEdit = () => {
    setEditingartist(null);
    setName('');
    setDescription('');
    // Reset any other necessary fields
  };

  const handleUpdateartist = async (e) => {
    e.preventDefault();

    // Update artist data in Firestore
    await updateDoc(doc(db, 'artists', editingartist.id), {
      name,
      description,
    });

    // Update the artist in the artists state
    setArtists((prevartists) =>
      prevartists.map((artist) =>
        artist.id === editingartist.id ? { ...artist, name, description } : artist
      )
    );

    // Clear edit mode and form fields
    setEditingartist(null);
    setName('');
    setDescription('');
    // Reset any other necessary fields
  };

  return (
    <Container className='
    my-3'>
      <h1 className='heading-text'>Meet The Team!</h1>
      <Row>
        {artists.map((artist, index) => (
            <Row key={artist.id} className={index % 2 === 0 ? 'flex-row' : 'flex-row-reverse'}>
            <Col sm={12} md={6} className="d-flex align-items-center">
              <Image src={artist.imageUrl} roundedCircle fluid />
            </Col>
            <Col sm={12} md={6} className="d-flex align-items-center justify-content-center" style={{textAlign:'center'}}>
              <div>
                <h2 className='heading-subtext'>{artist.name}</h2>
                <p className='paragraph-text'>{artist.description}</p>
                {editingartist && editingartist.id === artist.id ? (
                  <>
                    <Button variant="primary" onClick={handleUpdateartist}>
                      Update
                    </Button>
                    <Button variant="secondary" onClick={handleCancelEdit}>
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button variant="info" onClick={() => handleEditartist(artist)}>
                    Edit
                  </Button>
                )}
                <Button variant="danger" onClick={() => handleDeleteartist(artist)}>
                  Delete
                </Button>
              </div>
            </Col>
          </Row>
        ))}
      </Row>

      <Form onSubmit={handleAddartist} className='pe-3 pb-3 pt-3'>
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
          Add artist
        </Button>
      </Form>
      {/* Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={handleCloseDeleteModal}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete the artist?
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
