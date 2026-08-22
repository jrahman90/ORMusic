import React, { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Form,
  Button,
  Image,
  Modal,
  Spinner,
} from "react-bootstrap";
import { Link } from "react-router-dom";

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
import {
  ExternalLink,
  GripVertical,
  Pencil,
  Plus,
  Save,
  Trash2,
  UsersRound,
} from "lucide-react";
import { AdminToastOutlet, useAdminToasts } from "./useAdminToasts";

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
    <Col sm={12} md={6} xl={4} className="mb-3" ref={setNodeRef} style={style}>
      <article className={`admin-team-card ${isDragging ? "is-dragging" : ""}`}>
        <div className="admin-team-card-toolbar">
          <span>{artist.title || artist.role || artist.position || "Event specialist"}</span>
          <Button
            variant="outline-secondary"
            size="sm"
            {...attributes}
            {...listeners}
            aria-label={`Reorder ${artist.name || "team member"}`}
          >
            <GripVertical size={15} />
          </Button>
        </div>

        <div className="admin-team-photo">
          {artist.imageUrl ? (
            <img
              src={artist.imageUrl}
              alt={`${artist.name || "Team member"} portrait`}
            />
          ) : (
            <UsersRound size={34} />
          )}
        </div>

        <div className="admin-team-card-body">
          <h2>{artist.name || "Unnamed team member"}</h2>
          <p>{artist.description || "No description has been added yet."}</p>
        </div>

        <div className="admin-team-card-actions">
          <Button
            variant="outline-primary"
            size="sm"
            onClick={() => handleOpenEditModal(artist)}
          >
            <Pencil size={15} />
            Edit
          </Button>
          <Button
            as={Link}
            to={`/DJMC/${artist.id}`}
            variant="outline-secondary"
            size="sm"
          >
            <ExternalLink size={15} />
            View
          </Button>
          <Button
            variant="outline-danger"
            size="sm"
            onClick={() => handleDeleteArtist(artist)}
          >
            <Trash2 size={15} />
            Delete
          </Button>
        </div>
      </article>
    </Col>
  );
};

const DjmcAdmin = () => {
  const [artists, setArtists] = useState([]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingArtist, setEditingArtist] = useState(null);
  const [editName, setEditName] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editNumber, setEditNumber] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editImage, setEditImage] = useState(null);
  const [editImagePreview, setEditImagePreview] = useState("");

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [artistToDelete, setArtistToDelete] = useState(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [orderChanged, setOrderChanged] = useState(false);
  const { removeToast, showToast, toasts } = useAdminToasts();

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
    setTitle("");
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
      showToast("Please add name, description, and image.", {
        title: "Missing profile details",
        variant: "warning",
      });
      return;
    }

    setSaving(true);

    try {
      const imageUrl = await uploadArtistImage(image);

      const newArtist = {
        name,
        title: title.trim(),
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
      showToast("Team member profile created.");
    } catch (error) {
      console.error("Error adding artist:", error);
      showToast("Something went wrong while adding the team member.", {
        title: "Profile not created",
        variant: "danger",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleOpenEditModal = (artist) => {
    setEditingArtist(artist);
    setEditName(artist.name || "");
    setEditTitle(artist.title || artist.role || artist.position || "");
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
    setEditTitle("");
    setEditNumber("");
    setEditDescription("");
    setEditImage(null);
    setEditImagePreview("");
  };

  const handleUpdateArtist = async (e) => {
    e.preventDefault();

    if (!editingArtist) return;

    if (!editName || !editDescription || !editNumber) {
      showToast("Please fill out name, display order, and description.", {
        title: "Missing profile details",
        variant: "warning",
      });
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
        title: editTitle.trim(),
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
      showToast("Team member profile updated.");
    } catch (error) {
      console.error("Error updating artist:", error);
      showToast("Something went wrong while updating the team member.", {
        title: "Profile not updated",
        variant: "danger",
      });
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
      showToast("Team order saved.");
    } catch (error) {
      console.error("Error saving artist order:", error);
      showToast("Something went wrong while saving the order.", {
        title: "Order not saved",
        variant: "danger",
      });
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
      showToast("Team member deleted.");
    } catch (error) {
      console.error("Error deleting artist:", error);
      showToast("Something went wrong while deleting the team member.", {
        title: "Profile not deleted",
        variant: "danger",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setArtistToDelete(null);
  };

  return (
    <Container fluid="xl" className="admin-team-page py-3">
      <div className="admin-dashboard-header">
        <div>
          <div className="admin-dashboard-kicker">
            <UsersRound size={16} />
            Team admin
          </div>
          <h1>Team roster</h1>
          <p>Manage team profiles, public bios, photos, and roster order.</p>
          <div className="admin-dashboard-header-actions">
            <Button variant="primary" onClick={handleOpenAddModal}>
              <Plus size={16} />
              Add team member
            </Button>
            {orderChanged ? (
              <Button
                variant="success"
                onClick={handleSaveOrder}
                disabled={saving}
              >
                <Save size={16} />
                {saving ? "Saving..." : "Save order"}
              </Button>
            ) : null}
          </div>
        </div>

        <div className="admin-dashboard-summary" aria-label="Team summary">
          <div>
            <span>Profiles</span>
            <strong>{artists.length}</strong>
          </div>
          <div>
            <span>Photos</span>
            <strong>{artists.filter((artist) => artist.imageUrl).length}</strong>
          </div>
          <div>
            <span>Order</span>
            <strong>{orderChanged ? "!" : "OK"}</strong>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="admin-dashboard-empty">
          <Spinner animation="border" size="sm" />
          Loading team
        </div>
      ) : artists.length === 0 ? (
        <div className="admin-dashboard-empty">No team members yet.</div>
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
            <Row className="admin-team-grid">
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
          <Modal.Title>Add team member</Modal.Title>
        </Modal.Header>

        <Form onSubmit={handleAddArtist}>
          <Modal.Body>
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
              <Form.Label>Public role</Form.Label>
              <Form.Control
                type="text"
                placeholder="DJ / MC / Host"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
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
              {saving ? "Saving..." : "Create profile"}
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
          <Modal.Title>Edit team member</Modal.Title>
        </Modal.Header>

        <Form onSubmit={handleUpdateArtist}>
          <Modal.Body>
            <Row>
              <Col sm={12} md={4} className="text-center mb-3">
                {editImagePreview && (
                  <Image
                    src={editImagePreview}
                    fluid
                    className="admin-team-modal-image"
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
                  <Form.Label>Public role</Form.Label>
                  <Form.Control
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Display order</Form.Label>
                  <Form.Control
                    type="number"
                    value={editNumber}
                    onChange={(e) => setEditNumber(e.target.value)}
                  />
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
              {saving ? "Updating..." : "Save profile"}
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

      <AdminToastOutlet toasts={toasts} onClose={removeToast} />
    </Container>
  );
};

export default DjmcAdmin;
