import React, { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Form,
  Button,
  Image,
  Modal,
  Card,
  Spinner,
} from "react-bootstrap";

import db from "../../api/firestore/firestore";
import { storage } from "../../api/firestore/firestore";

import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  query,
  orderBy,
  writeBatch,
} from "firebase/firestore";

import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

import { v4 } from "uuid";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import {
  SortableContext,
  useSortable,
  arrayMove,
  rectSortingStrategy,
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";

const SortableArtistCard = ({
  artist,
  handleOpenEditModal,
  handleDeleteArtist,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: artist.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 999 : "auto",
  };

  return (
    <Col sm={12} md={6} lg={4} className="mb-4" ref={setNodeRef} style={style}>
      <Card className="h-100 shadow-sm">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <span className="text-muted">Order: {artist.number}</span>

          <Button
            variant="light"
            size="sm"
            {...attributes}
            {...listeners}
            style={{ cursor: "grab" }}
          >
            ☰ Drag
          </Button>
        </Card.Header>

        <div className="text-center pt-3">
          <Image
            src={artist.imageUrl}
            roundedCircle
            style={{
              width: "160px",
              height: "160px",
              objectFit: "cover",
            }}
          />
        </div>

        <Card.Body className="text-center">
          <Card.Title>{artist.name}</Card.Title>

          <Card.Text style={{ whiteSpace: "pre-line" }}>
            {artist.description}
          </Card.Text>

          <div className="d-flex justify-content-center gap-2">
            <Button variant="info" onClick={() => handleOpenEditModal(artist)}>
              Edit
            </Button>

            <Button variant="danger" onClick={() => handleDeleteArtist(artist)}>
              Delete
            </Button>
          </div>
        </Card.Body>
      </Card>
    </Col>
  );
};

const DjmcAdmin = () => {
  const [artists, setArtists] = useState([]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingArtist, setEditingArtist] = useState(null);
  const [editName, setEditName] = useState("");
  const [editNumber, setEditNumber] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editImage, setEditImage] = useState(null);
  const [editImagePreview, setEditImagePreview] = useState("");

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [artistToDelete, setArtistToDelete] = useState(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [orderChanged, setOrderChanged] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  useEffect(() => {
    fetchArtists();
  }, []);

  const fetchArtists = async () => {
    setLoading(true);

    try {
      const artistsCollection = collection(db, "artists");

      const artistsQuery = query(artistsCollection, orderBy("number", "asc"));

      const artistsSnapshot = await getDocs(artistsQuery);

      const artistsData = artistsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setArtists(artistsData);
      setOrderChanged(false);
    } catch (error) {
      console.error("Error fetching artists:", error);
    } finally {
      setLoading(false);
    }
  };

  const getNextOrderNumber = () => {
    if (artists.length === 0) return 1;

    const highestNumber = Math.max(
      ...artists.map((artist) => Number(artist.number || 0)),
    );

    return highestNumber + 1;
  };

  const resetAddForm = () => {
    setName("");
    setDescription("");
    setImage(null);

    const fileInput = document.getElementById("artistImageInput");
    if (fileInput) fileInput.value = "";
  };

  const handleOpenAddModal = () => {
    resetAddForm();
    setShowAddModal(true);
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
    resetAddForm();
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) setImage(file);
  };

  const handleEditImageChange = (e) => {
    const file = e.target.files[0];

    if (file) {
      setEditImage(file);
      setEditImagePreview(URL.createObjectURL(file));
    }
  };

  const uploadArtistImage = async (file) => {
    const storageRef = ref(storage, `images/${file.name}-${v4()}`);
    await uploadBytes(storageRef, file);
    const imageUrl = await getDownloadURL(storageRef);
    return imageUrl;
  };

  const handleAddArtist = async (e) => {
    e.preventDefault();

    if (!name || !description || !image) {
      alert("Please add name, description, and image.");
      return;
    }

    setSaving(true);

    try {
      const imageUrl = await uploadArtistImage(image);

      const newArtist = {
        name,
        description,
        imageUrl,
        number: getNextOrderNumber(),
      };

      const docRef = await addDoc(collection(db, "artists"), newArtist);

      setArtists((prevArtists) =>
        [...prevArtists, { id: docRef.id, ...newArtist }].sort(
          (a, b) => Number(a.number) - Number(b.number),
        ),
      );

      handleCloseAddModal();
    } catch (error) {
      console.error("Error adding artist:", error);
      alert("Something went wrong while adding the artist.");
    } finally {
      setSaving(false);
    }
  };

  const handleOpenEditModal = (artist) => {
    setEditingArtist(artist);
    setEditName(artist.name || "");
    setEditNumber(artist.number || "");
    setEditDescription(artist.description || "");
    setEditImage(null);
    setEditImagePreview(artist.imageUrl || "");
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingArtist(null);
    setEditName("");
    setEditNumber("");
    setEditDescription("");
    setEditImage(null);
    setEditImagePreview("");
  };

  const handleUpdateArtist = async (e) => {
    e.preventDefault();

    if (!editingArtist) return;

    if (!editName || !editDescription || !editNumber) {
      alert("Please fill out name, number, and description.");
      return;
    }

    setSaving(true);

    try {
      let updatedImageUrl = editingArtist.imageUrl;

      if (editImage) {
        updatedImageUrl = await uploadArtistImage(editImage);
      }

      const updatedArtist = {
        name: editName,
        description: editDescription,
        number: Number(editNumber),
        imageUrl: updatedImageUrl,
      };

      await updateDoc(doc(db, "artists", editingArtist.id), updatedArtist);

      setArtists((prevArtists) =>
        prevArtists
          .map((artist) =>
            artist.id === editingArtist.id
              ? { ...artist, ...updatedArtist }
              : artist,
          )
          .sort((a, b) => Number(a.number) - Number(b.number)),
      );

      handleCloseEditModal();
    } catch (error) {
      console.error("Error updating artist:", error);
      alert("Something went wrong while updating the artist.");
    } finally {
      setSaving(false);
    }
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    setArtists((items) => {
      const oldIndex = items.findIndex((artist) => artist.id === active.id);
      const newIndex = items.findIndex((artist) => artist.id === over.id);

      const reorderedArtists = arrayMove(items, oldIndex, newIndex).map(
        (artist, index) => ({
          ...artist,
          number: index + 1,
        }),
      );

      return reorderedArtists;
    });

    setOrderChanged(true);
  };

  const handleSaveOrder = async () => {
    setSaving(true);

    try {
      const batch = writeBatch(db);

      artists.forEach((artist, index) => {
        const artistRef = doc(db, "artists", artist.id);
        batch.update(artistRef, {
          number: index + 1,
        });
      });

      await batch.commit();

      setArtists((prevArtists) =>
        prevArtists.map((artist, index) => ({
          ...artist,
          number: index + 1,
        })),
      );

      setOrderChanged(false);
      alert("Artist order saved.");
    } catch (error) {
      console.error("Error saving artist order:", error);
      alert("Something went wrong while saving the order.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteArtist = (artist) => {
    setArtistToDelete(artist);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!artistToDelete) return;

    setSaving(true);

    try {
      await deleteDoc(doc(db, "artists", artistToDelete.id));

      const remainingArtists = artists
        .filter((artist) => artist.id !== artistToDelete.id)
        .map((artist, index) => ({
          ...artist,
          number: index + 1,
        }));

      const batch = writeBatch(db);

      remainingArtists.forEach((artist) => {
        const artistRef = doc(db, "artists", artist.id);
        batch.update(artistRef, {
          number: artist.number,
        });
      });

      await batch.commit();

      setArtists(remainingArtists);
      setShowDeleteModal(false);
      setArtistToDelete(null);
    } catch (error) {
      console.error("Error deleting artist:", error);
      alert("Something went wrong while deleting the artist.");
    } finally {
      setSaving(false);
    }
  };

  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setArtistToDelete(null);
  };

  return (
    <Container className="my-3">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="heading-text mb-0">Meet The Team Admin</h1>

        <Button variant="primary" onClick={handleOpenAddModal}>
          Add New Artist
        </Button>
      </div>

      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3 className="mb-0">Current Artists</h3>

        {orderChanged && (
          <Button variant="success" onClick={handleSaveOrder} disabled={saving}>
            {saving ? "Saving Order..." : "Save New Order"}
          </Button>
        )}
      </div>

      {loading ? (
        <div className="text-center my-5">
          <Spinner animation="border" />
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={artists.map((artist) => artist.id)}
            strategy={rectSortingStrategy}
          >
            <Row>
              {artists.map((artist) => (
                <SortableArtistCard
                  key={artist.id}
                  artist={artist}
                  handleOpenEditModal={handleOpenEditModal}
                  handleDeleteArtist={handleDeleteArtist}
                />
              ))}
            </Row>
          </SortableContext>
        </DndContext>
      )}

      {/* Add Artist Modal */}
      <Modal
        show={showAddModal}
        onHide={handleCloseAddModal}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Add New Artist</Modal.Title>
        </Modal.Header>

        <Form onSubmit={handleAddArtist}>
          <Modal.Body>
            <p className="text-muted">
              This artist will automatically be added as order number{" "}
              <strong>{getNextOrderNumber()}</strong>.
            </p>

            <Form.Group className="mb-3">
              <Form.Label>Name</Form.Label>
              <Form.Control
                type="text"
                placeholder="Example: DJ Opu"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={6}
                placeholder="Write the artist description here"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Artist Image</Form.Label>
              <Form.Control
                id="artistImageInput"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
              />
            </Form.Group>
          </Modal.Body>

          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseAddModal}>
              Cancel
            </Button>

            <Button variant="primary" type="submit" disabled={saving}>
              {saving ? "Saving..." : "Create Artist"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Edit Artist Modal */}
      <Modal
        show={showEditModal}
        onHide={handleCloseEditModal}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Edit Artist</Modal.Title>
        </Modal.Header>

        <Form onSubmit={handleUpdateArtist}>
          <Modal.Body>
            <Row>
              <Col sm={12} md={4} className="text-center mb-3">
                {editImagePreview && (
                  <Image
                    src={editImagePreview}
                    roundedCircle
                    fluid
                    style={{
                      width: "180px",
                      height: "180px",
                      objectFit: "cover",
                    }}
                  />
                )}
              </Col>

              <Col sm={12} md={8}>
                <Form.Group className="mb-3">
                  <Form.Label>Name</Form.Label>
                  <Form.Control
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Order Number</Form.Label>
                  <Form.Control
                    type="number"
                    value={editNumber}
                    onChange={(e) => setEditNumber(e.target.value)}
                  />
                  <Form.Text className="text-muted">
                    You can also rearrange artists by dragging the cards.
                  </Form.Text>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Description</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={6}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Replace Image</Form.Label>
                  <Form.Control
                    type="file"
                    accept="image/*"
                    onChange={handleEditImageChange}
                  />
                  <Form.Text className="text-muted">
                    Leave this blank if you do not want to change the image.
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>

          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseEditModal}>
              Cancel
            </Button>

            <Button variant="primary" type="submit" disabled={saving}>
              {saving ? "Updating..." : "Save Changes"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Delete Modal */}
      <Modal show={showDeleteModal} onHide={handleCloseDeleteModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          Are you sure you want to delete{" "}
          <strong>{artistToDelete?.name}</strong>?
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseDeleteModal}>
            Cancel
          </Button>

          <Button
            variant="danger"
            onClick={handleConfirmDelete}
            disabled={saving}
          >
            {saving ? "Deleting..." : "Delete"}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default DjmcAdmin;
