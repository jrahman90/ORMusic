import React, { useState, useEffect, useRef } from "react";
import {
  Button,
  Card,
  Container,
  Form,
  Row,
  Col,
  ProgressBar,
  Carousel,
  Ratio,
  Badge,
  Modal,
  Spinner,
} from "react-bootstrap";
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  getDocs,
} from "firebase/firestore";
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import db from "../../api/firestore/firestore";

const money = (v) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    Number(v || 0)
  );

const MediaCarousel = ({ media = [] }) => {
  if (!media.length) return null;
  return (
    <Carousel interval={null} indicators={media.length > 1}>
      {media.map((m, idx) => (
        <Carousel.Item key={`${m.url}-${idx}`}>
          {m.type === "video" ? (
            <Ratio aspectRatio="16x9">
              <video src={m.url} controls playsInline />
            </Ratio>
          ) : (
            <div
              style={{
                width: "100%",
                paddingTop: "56.25%",
                position: "relative",
                backgroundColor: "#f8f9fa",
              }}
            >
              <img
                src={m.url}
                alt={`media-${idx}`}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  borderTopLeftRadius: ".5rem",
                  borderTopRightRadius: ".5rem",
                }}
              />
            </div>
          )}
        </Carousel.Item>
      ))}
    </Carousel>
  );
};

const RentalsAdmin = () => {
  const [rentals, setRentals] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef(null);

  // create new item state
  const [newRental, setNewRental] = useState({
    name: "",
    description: "",
    price: "",
  });
  const [selectedFiles, setSelectedFiles] = useState([]);

  // edit modal state
  const [showEdit, setShowEdit] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({
    name: "",
    description: "",
    price: "",
  });
  const [editFiles, setEditFiles] = useState([]);
  const [editProgress, setEditProgress] = useState(0);
  const editFileRef = useRef(null);
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    const fetchRentals = async () => {
      try {
        const rentalsCollectionRef = collection(db, "rentals");
        const rentalsSnapshot = await getDocs(rentalsCollectionRef);
        const rentalsData = rentalsSnapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setRentals(rentalsData);
      } catch (error) {
        console.error("Error fetching rentals:", error);
      }
    };
    fetchRentals();
  }, []);

  const onFilesSelected = (e) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(files);
  };

  const resetForm = () => {
    setNewRental({ name: "", description: "", price: "" });
    setSelectedFiles([]);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadFilesToStorage = async (docId, files, setProgressCb) => {
    if (!files.length) return [];
    const storage = getStorage();
    const uploads = files.map(
      (file) =>
        new Promise((resolve, reject) => {
          const path = `rentals/${docId}/${Date.now()}_${file.name}`;
          const storageRef = ref(storage, path);
          const task = uploadBytesResumable(storageRef, file);

          task.on(
            "state_changed",
            (snap) => {
              const pct = Math.round(
                (snap.bytesTransferred / snap.totalBytes) * 100
              );
              if (setProgressCb) setProgressCb(pct);
            },
            reject,
            async () => {
              const url = await getDownloadURL(task.snapshot.ref);
              resolve({
                url,
                path,
                type: file.type.startsWith("video") ? "video" : "image",
              });
            }
          );
        })
    );

    const results = await Promise.all(uploads);
    return results;
  };

  const handleAddRental = async (e) => {
    e.preventDefault();
    if (isSaving) return;

    try {
      setIsSaving(true);
      const rentalCollectionRef = collection(db, "rentals");
      const base = {
        name: newRental.name.trim(),
        description: newRental.description.trim(),
        price: Number(newRental.price || 0),
        media: [],
        createdAt: Date.now(),
      };
      const newRentalDocRef = await addDoc(rentalCollectionRef, base);

      const media = await uploadFilesToStorage(
        newRentalDocRef.id,
        selectedFiles,
        setUploadProgress
      );

      if (media.length) {
        await updateDoc(doc(db, "rentals", newRentalDocRef.id), { media });
      }

      const newItem = { id: newRentalDocRef.id, ...base, media };
      setRentals((prev) => [...prev, newItem]);
      resetForm();
    } catch (error) {
      console.error("Error adding rental:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRental = async (id) => {
    try {
      const target = rentals.find((r) => r.id === id);
      if (target?.media?.length) {
        const storage = getStorage();
        await Promise.all(
          target.media.map(async (m) => {
            try {
              if (m.path) {
                await deleteObject(ref(storage, m.path));
              }
            } catch {
              console.warn("Cannot delete file at", m.path);
            }
          })
        );
      }
      await deleteDoc(doc(db, "rentals", id));
      setRentals((prev) => prev.filter((r) => r.id !== id));
    } catch (error) {
      console.error("Error deleting rental:", error);
    }
  };

  const handleRemoveSingleMedia = async (rentalId, mediaIndex) => {
    try {
      const target = rentals.find((r) => r.id === rentalId);
      if (!target) return;

      const storage = getStorage();
      const toRemove = target.media[mediaIndex];
      if (toRemove?.path) {
        try {
          await deleteObject(ref(storage, toRemove.path));
        } catch {
          console.warn("Cannot delete file at", toRemove.path);
        }
      }

      const nextMedia = target.media.filter((_, i) => i !== mediaIndex);
      await updateDoc(doc(db, "rentals", rentalId), { media: nextMedia });

      setRentals((prev) =>
        prev.map((r) => (r.id === rentalId ? { ...r, media: nextMedia } : r))
      );
    } catch (error) {
      console.error("Error removing media:", error);
    }
  };

  // open edit modal with item data
  const openEdit = (item) => {
    setEditingId(item.id);
    setEditData({
      name: item.name || "",
      description: item.description || "",
      price: item.price != null ? String(item.price) : "",
    });
    setEditFiles([]);
    setEditProgress(0);
    if (editFileRef.current) editFileRef.current.value = "";
    setShowEdit(true);
  };

  const closeEdit = () => {
    if (editSaving) return;
    setShowEdit(false);
    setEditingId(null);
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    if (!editingId || editSaving) return;

    try {
      setEditSaving(true);

      // update basic fields
      const updates = {
        name: editData.name.trim(),
        description: editData.description.trim(),
        price: Number(editData.price || 0),
      };
      await updateDoc(doc(db, "rentals", editingId), updates);

      // upload any new files and append to media
      let newMedia = [];
      if (editFiles.length) {
        newMedia = await uploadFilesToStorage(
          editingId,
          editFiles,
          setEditProgress
        );
        if (newMedia.length) {
          const current = rentals.find((r) => r.id === editingId)?.media || [];
          const merged = [...current, ...newMedia];
          await updateDoc(doc(db, "rentals", editingId), { media: merged });
        }
      }

      // update local state
      setRentals((prev) =>
        prev.map((r) =>
          r.id === editingId
            ? {
                ...r,
                ...updates,
                media: newMedia.length
                  ? [...(r.media || []), ...newMedia]
                  : r.media || [],
              }
            : r
        )
      );

      setShowEdit(false);
      setEditingId(null);
    } catch (error) {
      console.error("Error saving changes:", error);
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <Container className="py-3">
      <div className="d-flex align-items-center justify-content-between mb-2">
        <h2 className="m-0">Rentals Admin</h2>
        <Badge bg="secondary" pill>
          {rentals.length} items
        </Badge>
      </div>

      <Card className="mb-4 shadow-sm border-0">
        <Card.Body>
          <Card.Title className="mb-3">Add a new rental</Card.Title>
          <Form onSubmit={handleAddRental}>
            <Row className="g-3">
              <Col md={4}>
                <Form.Group controlId="rentalName">
                  <Form.Label>Name</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Projector, Screen, Lighting"
                    value={newRental.name}
                    onChange={(e) =>
                      setNewRental({ ...newRental, name: e.target.value })
                    }
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={5}>
                <Form.Group controlId="rentalDesc">
                  <Form.Label>Description</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Brief details that help customers choose"
                    value={newRental.description}
                    onChange={(e) =>
                      setNewRental({
                        ...newRental,
                        description: e.target.value,
                      })
                    }
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group controlId="rentalPrice">
                  <Form.Label>Price</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="100.00"
                    value={newRental.price}
                    onChange={(e) =>
                      setNewRental({ ...newRental, price: e.target.value })
                    }
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group controlId="rentalMedia">
                  <Form.Label>Images or videos</Form.Label>
                  <Form.Control
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    onChange={onFilesSelected}
                  />
                  {uploadProgress > 0 && uploadProgress < 100 ? (
                    <div className="mt-2">
                      <ProgressBar
                        now={uploadProgress}
                        label={`${uploadProgress}%`}
                      />
                    </div>
                  ) : null}
                </Form.Group>
              </Col>
              <Col xs={12} className="d-flex gap-2">
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "Saving..." : "Add Rental"}
                </Button>
                <Button
                  variant="outline-secondary"
                  type="button"
                  onClick={resetForm}
                  disabled={isSaving}
                >
                  Reset
                </Button>
              </Col>
            </Row>
          </Form>
        </Card.Body>
      </Card>

      {rentals.length === 0 ? (
        <p>No rental items available</p>
      ) : (
        <Row xs={1} sm={2} lg={3} xl={4} className="g-3">
          {rentals.map((item) => (
            <Col key={item.id}>
              <Card className="h-100 shadow-sm border-0">
                {Array.isArray(item.media) && item.media.length > 0 ? (
                  <MediaCarousel media={item.media} />
                ) : null}
                <Card.Body className="d-flex flex-column">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <Card.Title className="mb-0">{item.name}</Card.Title>
                    <Badge bg="dark">{money(item.price)}</Badge>
                  </div>
                  {item.description ? (
                    <Card.Text className="text-muted">
                      {item.description}
                    </Card.Text>
                  ) : (
                    <div />
                  )}

                  {Array.isArray(item.media) && item.media.length > 0 ? (
                    <>
                      <hr />
                      <div className="small text-muted mb-2">Media</div>
                      <div className="d-flex flex-wrap gap-2">
                        {item.media.map((m, idx) => (
                          <div
                            key={`${m.url}-${idx}`}
                            className="position-relative"
                          >
                            {m.type === "video" ? (
                              <div
                                style={{
                                  width: 120,
                                  height: 68,
                                  background: "#000",
                                  borderRadius: 8,
                                  overflow: "hidden",
                                }}
                                title="Video"
                              >
                                <video
                                  src={m.url}
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                  }}
                                  muted
                                />
                              </div>
                            ) : (
                              <img
                                src={m.url}
                                alt={`thumb-${idx}`}
                                style={{
                                  width: 120,
                                  height: 68,
                                  objectFit: "cover",
                                  borderRadius: 8,
                                }}
                              />
                            )}
                            <Button
                              size="sm"
                              variant="outline-danger"
                              className="mt-1 w-100"
                              onClick={() =>
                                handleRemoveSingleMedia(item.id, idx)
                              }
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : null}

                  <div className="mt-auto d-grid gap-2">
                    <Button
                      variant="outline-primary"
                      onClick={() => openEdit(item)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => handleDeleteRental(item.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </Card.Body>
                <Card.Footer className="text-muted small">
                  Minimum 4 hour rental, setup handled by our team
                </Card.Footer>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Edit Modal */}
      <Modal
        show={showEdit}
        onHide={closeEdit}
        backdrop="static"
        keyboard={false}
      >
        <Form onSubmit={handleEditSave}>
          <Modal.Header closeButton>
            <Modal.Title>Edit item</Modal.Title>
          </Modal.Header>

          <Modal.Body>
            <Row className="g-3">
              <Col md={6}>
                <Form.Group controlId="editName">
                  <Form.Label>Name</Form.Label>
                  <Form.Control
                    type="text"
                    value={editData.name}
                    onChange={(e) =>
                      setEditData((s) => ({ ...s, name: e.target.value }))
                    }
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group controlId="editPrice">
                  <Form.Label>Price</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    step="0.01"
                    value={editData.price}
                    onChange={(e) =>
                      setEditData((s) => ({ ...s, price: e.target.value }))
                    }
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group controlId="editDesc">
                  <Form.Label>Description</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={editData.description}
                    onChange={(e) =>
                      setEditData((s) => ({
                        ...s,
                        description: e.target.value,
                      }))
                    }
                  />
                </Form.Group>
              </Col>

              <Col md={12}>
                <Form.Group controlId="editMedia">
                  <Form.Label>Add more images or videos</Form.Label>
                  <Form.Control
                    ref={editFileRef}
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    onChange={(e) =>
                      setEditFiles(Array.from(e.target.files || []))
                    }
                    disabled={editSaving}
                  />
                  {editProgress > 0 && editProgress < 100 ? (
                    <div className="mt-2">
                      <ProgressBar
                        now={editProgress}
                        label={`${editProgress}%`}
                      />
                    </div>
                  ) : null}
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>

          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={closeEdit}
              disabled={editSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={editSaving}>
              {editSaving ? (
                <>
                  <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                    className="me-2"
                  />
                  Saving...
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default RentalsAdmin;
