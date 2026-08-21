import React, { useState, useEffect, useRef } from "react";
import {
  Button,
  Container,
  Form,
  InputGroup,
  Row,
  Col,
  ProgressBar,
  Badge,
  Modal,
  Spinner,
} from "react-bootstrap";
import {
  ChevronDown,
  Edit3,
  Image as ImageIcon,
  Package,
  Percent,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
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
import {
  DEFAULT_DISCOUNT_NAME,
  buildDiscountFields,
  getItemPricing,
  money,
} from "../../utils/pricing";

const CATEGORIES = ["packages", "addons"];

const blankDiscount = {
  discountEnabled: false,
  discountName: DEFAULT_DISCOUNT_NAME,
  discountType: "percent",
  discountValue: "",
};

const blankRental = {
  name: "",
  description: "",
  price: "",
  categories: [],
  ...blankDiscount,
};

const categoryLabel = (category) =>
  category === "addons"
    ? "rentals"
    : category === "packages"
    ? "packages"
    : category || "uncategorized";

const categoryVariant = (category) =>
  category === "packages" ? "primary" : category === "addons" ? "info" : "secondary";

const firstMedia = (item = {}) =>
  Array.isArray(item.media) && item.media.length > 0 ? item.media[0] : null;

function CategoryBadges({ categories = [] }) {
  const list = Array.isArray(categories) && categories.length ? categories : ["uncategorized"];
  return (
    <div className="admin-rental-badges">
      {list.map((category) => (
        <Badge key={category} bg={categoryVariant(category)}>
          {categoryLabel(category)}
        </Badge>
      ))}
    </div>
  );
}

function RentalThumb({ item }) {
  const media = firstMedia(item);
  return (
    <div className="admin-rental-thumb">
      {media ? (
        media.type === "video" ? (
          <video src={media.url} muted playsInline />
        ) : (
          <img src={media.url} alt={item.name || "Rental item"} />
        )
      ) : (
        <ImageIcon size={20} />
      )}
    </div>
  );
}

function PriceStack({ item }) {
  const pricing = getItemPricing(item);
  return (
    <div className="admin-rental-price">
      {pricing.hasDiscount ? (
        <span className="text-decoration-line-through">
          {money(pricing.originalUnitPrice)}
        </span>
      ) : null}
      <strong>{money(pricing.unitPrice)}</strong>
      {pricing.hasDiscount ? (
        <small>{pricing.discountName}</small>
      ) : item.discountEnabled ? (
        <small>Discount on, no value</small>
      ) : null}
    </div>
  );
}

function CategoryChecks({ value = [], onChange, disabled, controlIdPrefix }) {
  const setChecked = (cat, checked) => {
    if (!onChange) return;
    const next = new Set(value || []);
    if (checked) next.add(cat);
    else next.delete(cat);
    onChange(Array.from(next));
  };
  return (
    <Row>
      {CATEGORIES.map((cat) => (
        <Col xs="auto" key={cat}>
          <Form.Check
            id={`${controlIdPrefix}-${cat}`}
            type="checkbox"
            label={cat}
            checked={Array.isArray(value) && value.includes(cat)}
            onChange={(e) => setChecked(cat, e.target.checked)}
            disabled={disabled}
          />
        </Col>
      ))}
    </Row>
  );
}

function DiscountFields({ value = {}, onChange, disabled, controlIdPrefix }) {
  const update = (patch) => onChange?.({ ...value, ...patch });
  return (
    <Row className="g-2 align-items-end">
      <Col xs={12} md={3}>
        <Form.Check
          id={`${controlIdPrefix}-enabled`}
          type="switch"
          label="Discount active"
          checked={Boolean(value.discountEnabled)}
          onChange={(event) =>
            update({ discountEnabled: event.target.checked })
          }
          disabled={disabled}
        />
      </Col>
      <Col xs={12} md={4}>
        <Form.Label>Name</Form.Label>
        <Form.Control
          type="text"
          placeholder={DEFAULT_DISCOUNT_NAME}
          value={value.discountName || ""}
          onChange={(event) => update({ discountName: event.target.value })}
          disabled={disabled}
        />
      </Col>
      <Col xs={6} md={2}>
        <Form.Label>Type</Form.Label>
        <Form.Select
          value={value.discountType || "percent"}
          onChange={(event) => update({ discountType: event.target.value })}
          disabled={disabled}
        >
          <option value="percent">Percent</option>
          <option value="amount">Amount</option>
        </Form.Select>
      </Col>
      <Col xs={6} md={3}>
        <Form.Label>Value</Form.Label>
        <Form.Control
          type="number"
          min="0"
          step="0.01"
          placeholder={value.discountType === "amount" ? "100.00" : "10"}
          value={value.discountValue || ""}
          onChange={(event) => update({ discountValue: event.target.value })}
          disabled={disabled}
        />
      </Col>
    </Row>
  );
}

const RentalsAdmin = () => {
  const [rentals, setRentals] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [expandedItems, setExpandedItems] = useState({});
  const [showCreateForm, setShowCreateForm] = useState(false);

  // create new item state
  const [newRental, setNewRental] = useState(blankRental);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [bulkDiscount, setBulkDiscount] = useState({
    target: "all",
    discountEnabled: true,
    discountName: DEFAULT_DISCOUNT_NAME,
    discountType: "percent",
    discountValue: "",
  });

  // edit modal state
  const [showEdit, setShowEdit] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({
    name: "",
    description: "",
    price: "",
    categories: [],
    ...blankDiscount,
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
    setNewRental(blankRental);
    setSelectedFiles([]);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const toggleExpanded = (itemId) => {
    setExpandedItems((current) => ({
      ...current,
      [itemId]: !current[itemId],
    }));
  };

  const matchesDiscountTarget = (item, target = bulkDiscount.target) => {
    if (target === "all") return true;
    const categories = Array.isArray(item.categories) ? item.categories : [];
    return categories.includes(target);
  };

  const applyBulkDiscount = async (source = bulkDiscount) => {
    const targets = rentals.filter((item) =>
      matchesDiscountTarget(item, source.target)
    );
    if (targets.length === 0 || isSaving) return;

    const payload = buildDiscountFields(source);
    try {
      setIsSaving(true);
      await Promise.all(
        targets.map((item) => updateDoc(doc(db, "rentals", item.id), payload))
      );
      setRentals((prev) =>
        prev.map((item) =>
          matchesDiscountTarget(item, source.target)
            ? { ...item, ...payload }
            : item
        )
      );
      setBulkDiscount(source);
    } catch (error) {
      console.error("Bulk discount update failed:", error);
    } finally {
      setIsSaving(false);
    }
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
        categories: Array.isArray(newRental.categories)
          ? newRental.categories
          : [],
        ...buildDiscountFields(newRental),
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
    const target = rentals.find((r) => r.id === id);
    const ok = window.confirm(
      `Delete ${target?.name || "this rental item"} permanently?`
    );
    if (!ok) return;
    try {
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
      categories: Array.isArray(item.categories) ? item.categories : [],
      discountEnabled: Boolean(item.discountEnabled),
      discountName: item.discountName || DEFAULT_DISCOUNT_NAME,
      discountType: item.discountType === "amount" ? "amount" : "percent",
      discountValue:
        item.discountValue != null ? String(item.discountValue) : "",
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
        categories: Array.isArray(editData.categories)
          ? editData.categories
          : [],
        ...buildDiscountFields(editData),
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

  const bulkTargetCount = rentals.filter((item) =>
    matchesDiscountTarget(item)
  ).length;
  const packageCount = rentals.filter((item) =>
    Array.isArray(item.categories) ? item.categories.includes("packages") : false
  ).length;
  const addonCount = rentals.filter((item) =>
    Array.isArray(item.categories) ? item.categories.includes("addons") : false
  ).length;
  const discountedCount = rentals.filter((item) => getItemPricing(item).hasDiscount)
    .length;
  const mediaCount = rentals.reduce(
    (sum, item) => sum + (Array.isArray(item.media) ? item.media.length : 0),
    0
  );
  const normalizedSearch = search.trim().toLowerCase();
  const filteredRentals = rentals.filter((item) => {
    const categories = Array.isArray(item.categories) ? item.categories : [];
    const matchesCategory =
      categoryFilter === "all" ||
      (categoryFilter === "discounted" && getItemPricing(item).hasDiscount) ||
      categories.includes(categoryFilter);
    const haystack = `${item.name || ""} ${item.description || ""} ${categories.join(
      " "
    )}`.toLowerCase();
    const matchesSearch =
      !normalizedSearch || haystack.includes(normalizedSearch);
    return matchesCategory && matchesSearch;
  });

  return (
    <Container fluid="xl" className="admin-dashboard admin-rentals-page py-3">
      <div className="admin-dashboard-header">
        <div>
          <div className="admin-dashboard-kicker">
            <Package size={16} />
            Catalog admin
          </div>
          <h1>Rental items</h1>
          <p>
            Manage packages, add-ons, media, and seasonal pricing without
            scanning every description at once.
          </p>
          <div className="admin-dashboard-header-actions">
            <Button
              type="button"
              onClick={() => setShowCreateForm((current) => !current)}
            >
              <Plus size={17} />
              {showCreateForm ? "Close add item" : "Add item"}
            </Button>
          </div>
        </div>

        <div className="admin-dashboard-summary" aria-label="Catalog summary">
          <div>
            <span>Items</span>
            <strong>{rentals.length}</strong>
          </div>
          <div>
            <span>Discounts</span>
            <strong>{discountedCount}</strong>
          </div>
          <div>
            <span>Media</span>
            <strong>{mediaCount}</strong>
          </div>
        </div>
      </div>

      <div className="admin-dashboard-toolbar admin-rentals-toolbar">
        <InputGroup className="admin-dashboard-search">
          <InputGroup.Text>
            <Search size={16} />
          </InputGroup.Text>
          <Form.Control
            type="search"
            placeholder="Search item name, description, or category"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </InputGroup>

        <div className="admin-dashboard-status-filters">
          {[
            ["all", "All", rentals.length],
            ["packages", "Packages", packageCount],
            ["addons", "Rentals", addonCount],
            ["discounted", "Discounted", discountedCount],
          ].map(([id, label, count]) => (
            <Button
              key={id}
              size="sm"
              variant={categoryFilter === id ? "primary" : "outline-primary"}
              onClick={() => setCategoryFilter(id)}
            >
              {label}
              <Badge
                bg={categoryFilter === id ? "light" : "secondary"}
                text={categoryFilter === id ? "dark" : undefined}
                className="ms-2"
              >
                {count}
              </Badge>
            </Button>
          ))}
        </div>
      </div>

      {showCreateForm ? (
        <section className="admin-event-section admin-rental-create-section">
          <div className="admin-event-section-heading">
            <div>
              <span>Create</span>
              <h2>Add a new catalog item</h2>
            </div>
          </div>
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
                  <Form.Label>Original price</Form.Label>
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
                <Form.Group controlId="rentalCategories">
                  <Form.Label>Categories</Form.Label>
                  <CategoryChecks
                    controlIdPrefix="create-cat"
                    value={newRental.categories}
                    onChange={(cats) =>
                      setNewRental({ ...newRental, categories: cats })
                    }
                    disabled={isSaving}
                  />
                  <Form.Text muted>
                    Choose one or both: packages, addons
                  </Form.Text>
                </Form.Group>
              </Col>

              <Col md={12}>
                <Form.Group controlId="rentalDiscount">
                  <Form.Label>Discount</Form.Label>
                  <DiscountFields
                    controlIdPrefix="create-discount"
                    value={newRental}
                    onChange={setNewRental}
                    disabled={isSaving}
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
              <Col xs={12} className="admin-rental-form-actions">
                <Button type="submit" disabled={isSaving}>
                  <Plus size={16} />
                  {isSaving ? "Saving..." : "Add item"}
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
        </section>
      ) : null}

      <section className="admin-event-section admin-rental-discount-section">
        <div className="admin-event-section-heading">
          <div>
            <span>Pricing</span>
            <h2>Bulk discount</h2>
          </div>
          <Badge bg="light" text="dark">
            {bulkTargetCount} selected
          </Badge>
        </div>
        <Row className="g-3 align-items-end">
          <Col md={3}>
            <Form.Group controlId="bulkDiscountTarget">
              <Form.Label>Apply to</Form.Label>
              <Form.Select
                value={bulkDiscount.target}
                onChange={(event) =>
                  setBulkDiscount((current) => ({
                    ...current,
                    target: event.target.value,
                  }))
                }
                disabled={isSaving}
              >
                <option value="all">All items</option>
                <option value="packages">Packages</option>
                <option value="addons">Rentals / add-ons</option>
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={9}>
            <DiscountFields
              controlIdPrefix="bulk-discount"
              value={bulkDiscount}
              onChange={setBulkDiscount}
              disabled={isSaving}
            />
          </Col>
          <Col xs={12} className="admin-rental-form-actions">
            <Button
              type="button"
              onClick={() => applyBulkDiscount()}
              disabled={isSaving || bulkTargetCount === 0}
            >
              <Percent size={16} />
              Apply discount
            </Button>
            <Button
              type="button"
              variant="outline-secondary"
              onClick={() =>
                applyBulkDiscount({ ...bulkDiscount, discountEnabled: false })
              }
              disabled={isSaving || bulkTargetCount === 0}
            >
              Turn off selected
            </Button>
          </Col>
        </Row>
      </section>

      <section className="admin-event-section admin-rental-catalog-section">
        <div className="admin-event-section-heading">
          <div>
            <span>Catalog</span>
            <h2>Items</h2>
          </div>
          <Badge bg="light" text="dark">
            {filteredRentals.length} shown
          </Badge>
        </div>

        {rentals.length === 0 ? (
          <div className="admin-event-empty">No rental items available.</div>
        ) : filteredRentals.length === 0 ? (
          <div className="admin-event-empty">
            No items match the current search and filters.
          </div>
        ) : (
          <div className="admin-rental-list">
            {filteredRentals.map((item) => {
              const expanded = Boolean(expandedItems[item.id]);
              const media = Array.isArray(item.media) ? item.media : [];
              return (
                <article
                  key={item.id}
                  className={`admin-rental-row ${expanded ? "is-expanded" : ""}`}
                >
                  <div className="admin-rental-row-main">
                    <button
                      type="button"
                      className="admin-rental-row-toggle"
                      onClick={() => toggleExpanded(item.id)}
                      aria-expanded={expanded}
                    >
                      <RentalThumb item={item} />
                      <div className="admin-rental-summary">
                        <strong>{item.name || "Unnamed item"}</strong>
                        <span>
                          {media.length} media file{media.length === 1 ? "" : "s"}
                        </span>
                        <CategoryBadges categories={item.categories} />
                      </div>
                      <PriceStack item={item} />
                      <ChevronDown size={18} className="admin-rental-chevron" />
                    </button>

                    <div className="admin-rental-row-actions">
                      <Button
                        size="sm"
                        variant="outline-primary"
                        onClick={() => openEdit(item)}
                      >
                        <Edit3 size={15} />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline-danger"
                        onClick={() => handleDeleteRental(item.id)}
                      >
                        <Trash2 size={15} />
                        Delete
                      </Button>
                    </div>
                  </div>

                  {expanded ? (
                    <div className="admin-rental-details">
                      <div>
                        <span>Description</span>
                        <p>{item.description || "No description added."}</p>
                      </div>
                      <div>
                        <span>Media</span>
                        {media.length === 0 ? (
                          <p>No media has been uploaded for this item.</p>
                        ) : (
                          <div className="admin-rental-media-grid">
                            {media.map((mediaItem, idx) => (
                              <div key={`${mediaItem.url}-${idx}`}>
                                {mediaItem.type === "video" ? (
                                  <video src={mediaItem.url} muted playsInline />
                                ) : (
                                  <img
                                    src={mediaItem.url}
                                    alt={`${item.name || "Item"} media ${idx + 1}`}
                                  />
                                )}
                                <Button
                                  size="sm"
                                  variant="outline-danger"
                                  onClick={() =>
                                    handleRemoveSingleMedia(item.id, idx)
                                  }
                                >
                                  Remove
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </section>

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
                  <Form.Label>Original price</Form.Label>
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
                <Form.Group controlId="editCategories">
                  <Form.Label>Categories</Form.Label>
                  <CategoryChecks
                    controlIdPrefix="edit-cat"
                    value={editData.categories}
                    onChange={(cats) =>
                      setEditData((s) => ({ ...s, categories: cats }))
                    }
                    disabled={editSaving}
                  />
                </Form.Group>
              </Col>

              <Col md={12}>
                <Form.Group controlId="editDiscount">
                  <Form.Label>Discount</Form.Label>
                  <DiscountFields
                    controlIdPrefix="edit-discount"
                    value={editData}
                    onChange={setEditData}
                    disabled={editSaving}
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
