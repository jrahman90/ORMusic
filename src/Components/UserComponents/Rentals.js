import React, { useState, useEffect, useRef } from "react";
import {
  Button,
  Card,
  Container,
  Row,
  Col,
  Badge,
  Carousel,
  Ratio,
  Form,
  ButtonGroup,
} from "react-bootstrap";
import { collection, getDocs } from "firebase/firestore";
import { Link } from "react-router-dom";
import db from "../../api/firestore/firestore";

const money = (v) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    Number(v || 0)
  );

/* ---------- Media ---------- */
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

/* ---------- Snack: lightweight top overlay with slide and fade ---------- */
function Snack({ show, onClose, text = "Added to cart" }) {
  const [visible, setVisible] = useState(false);
  const timers = useRef({ t1: null, t2: null });

  useEffect(() => {
    const currentTimers = timers.current;
    // clear any running timers
    clearTimeout(currentTimers.t1);
    clearTimeout(currentTimers.t2);

    if (show) {
      // enter on next frame for smooth transition
      requestAnimationFrame(() => setVisible(true));
      // stay visible for 1s, then animate out, then call onClose after 180ms
      currentTimers.t1 = setTimeout(() => {
        setVisible(false);
        currentTimers.t2 = setTimeout(() => {
          onClose?.();
        }, 200); // match CSS transition
      }, 2000);
    } else {
      setVisible(false);
    }

    return () => {
      clearTimeout(currentTimers.t1);
      clearTimeout(currentTimers.t2);
    };
  }, [show, onClose]);

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      style={{
        zIndex: 1080,
        position: "fixed",
        top: "1rem",
        left: "50%",
        transform: "translateX(-50%)",
        pointerEvents: "none",
      }}
    >
      <div className={`snack ${visible ? "snack-in" : ""}`}>
        <span className="me-1">✔</span> {text}
      </div>

      <style>{`
        .snack {
          max-width: 220px;
          padding: .5rem 1rem;
          border-radius: 8px;
          background: #198754;
          color: #fff;
          text-align: center;
          box-shadow: 0 6px 20px rgba(0,0,0,.15);
          transform: translateY(-12px);
          opacity: 0;
          transition: transform 180ms ease, opacity 180ms ease;
          margin: 0 auto;
          pointer-events: auto;
          font-size: .85rem;
          font-weight: 600;
        }
        .snack.snack-in {
          transform: translateY(0);
          opacity: 1;
        }
      `}</style>
    </div>
  );
}

/* ---------- Section grid ---------- */
function SectionGrid({ title, items = [], onAddToCart }) {
  if (!items.length) return null;

  return (
    <>
      <div className="d-flex align-items-center justify-content-between mt-4 mb-2">
        <h3 className="m-0">{title}</h3>
        <Badge bg="secondary" pill>
          {items.length} items
        </Badge>
      </div>

      <Row xs={1} sm={2} md={3} xl={4} className="g-3">
        {items.map((item) => (
          <Col key={`${title}-${item.id}`}>
            <Card className="h-100 shadow-sm border-0">
              {Array.isArray(item.media) && item.media.length > 0 ? (
                <MediaCarousel media={item.media} />
              ) : null}
              <Card.Body className="d-flex flex-column">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <div>
                    <Card.Title className="mb-0">{item.name}</Card.Title>
                    <div className="d-flex flex-wrap gap-1 mt-1">
                      {(Array.isArray(item.categories) ? item.categories : [])
                        .length > 0 ? (
                        item.categories.map((c) => (
                          <Badge key={c} bg="info">
                            {c}
                          </Badge>
                        ))
                      ) : (
                        <Badge bg="secondary">uncategorized</Badge>
                      )}
                    </div>
                  </div>
                  <Badge bg="dark">{money(item.price)}</Badge>
                </div>

                {item.description ? (
                  <Card.Text className="text-muted" style={{ minHeight: 48 }}>
                    {item.description}
                  </Card.Text>
                ) : (
                  <div style={{ minHeight: 48 }} />
                )}

                <div className="mt-auto d-grid">
                  <Button variant="primary" onClick={() => onAddToCart(item)}>
                    Add to Cart
                  </Button>
                </div>
              </Card.Body>
              <Card.Footer className="text-muted small">
                Prices listed are not final until confirmed.
              </Card.Footer>
            </Card>
          </Col>
        ))}
      </Row>
    </>
  );
}

/* ---------- Page ---------- */
const Rentals = ({ addToCart }) => {
  const [rentals, setRentals] = useState([]);
  const [addedToCart, setAddedToCart] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
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
      } finally {
        setLoading(false);
      }
    };

    fetchRentals();
  }, []);

  useEffect(() => {
    const readCart = () => {
      try {
        const raw = localStorage.getItem("cartItems");
        const arr = raw ? JSON.parse(raw) : [];
        const total = arr.reduce((sum, it) => sum + Number(it.quantity || 0), 0);
        setCartCount(total);
      } catch {
        setCartCount(0);
      }
    };
    readCart();
    window.addEventListener("cart:update", readCart);
    return () => window.removeEventListener("cart:update", readCart);
  }, []);

  const addToCartLocal = (item) => {
    try {
      const raw = localStorage.getItem("cartItems");
      const arr = raw ? JSON.parse(raw) : [];
      const idx = arr.findIndex((it) => it.id === item.id);

      if (idx > -1) {
        arr[idx].quantity = Number(arr[idx].quantity || 0) + 1;
      } else {
        arr.push({
          id: item.id,
          name: item.name,
          price: item.price,
          description: item.description || "",
          media: Array.isArray(item.media) ? item.media : [],
          quantity: 1,
          categories: Array.isArray(item.categories) ? item.categories : [],
        });
      }

      localStorage.setItem("cartItems", JSON.stringify(arr));
      window.dispatchEvent(new Event("cart:update"));
    } catch (e) {
      console.error("Failed to save cart", e);
    }
  };

  const handleAddToCart = (item) => {
    if (typeof addToCart === "function") {
      addToCart(item);
    } else {
      addToCartLocal(item);
    }
    setAddedToCart(true);
    // Snack will auto hide and call onClose to set false
  };

  const normalizedQuery = search.trim().toLowerCase();
  const visibleRentals = rentals.filter((r) => {
    const matchesCategory =
      category === "all" ||
      (Array.isArray(r.categories) && r.categories.includes(category));
    const haystack = `${r.name || ""} ${r.description || ""}`.toLowerCase();
    const matchesSearch = !normalizedQuery || haystack.includes(normalizedQuery);
    return matchesCategory && matchesSearch;
  });

  const itemsWith = (cat) =>
    visibleRentals.filter((r) =>
      Array.isArray(r.categories) ? r.categories.includes(cat) : false
    );

  const packages = itemsWith("packages");
  const rentalsSection = itemsWith("addons"); // Rentals section

  const nothingToShow =
    !loading && visibleRentals.length === 0;

  return (
    <Container className="py-3">
      {/* Compact animated snackbar */}
      <Snack
        show={addedToCart}
        onClose={() => setAddedToCart(false)}
        text="Added to cart"
      />

      <header className="page-intro">
        <h1>Event Rentals and Production Services</h1>
        <p>
          Build your event package with DJ/MC services, sound, lighting,
          staging, screens, decor support, and add-ons for weddings, corporate
          events, concerts, and private parties.
        </p>
      </header>

      <div className="d-flex justify-content-center my-3">
        <div
          className="text-center px-3 py-2 bg-light rounded shadow-sm"
          style={{ maxWidth: 600 }}
        >
          <p className="mb-0 small text-muted">
            Please add items to your cart to submit an inquiry. Payments and
            bookings will only be processed once your inquiry has been reviewed
            and confirmed.
          </p>
        </div>
      </div>

      <div className="services-toolbar mb-3">
        <Form.Control
          type="search"
          placeholder="Search services, lighting, screens, packages..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search services"
        />
        <ButtonGroup aria-label="Service categories">
          {[
            ["all", "All"],
            ["packages", "Packages"],
            ["addons", "Rentals"],
          ].map(([id, label]) => (
            <Button
              key={id}
              variant={category === id ? "primary" : "outline-primary"}
              onClick={() => setCategory(id)}
            >
              {label}
            </Button>
          ))}
        </ButtonGroup>
        <Button
          as={Link}
          to="/Cart"
          variant={cartCount > 0 ? "success" : "outline-secondary"}
          className="mini-cart-button"
        >
          Cart {cartCount > 0 ? `(${cartCount})` : ""}
        </Button>
      </div>

      {loading ? (
        <p>Loading products...</p>
      ) : nothingToShow ? (
        <Card className="shadow-sm">
          <Card.Body>
            <Card.Title>Coming soon</Card.Title>
            <Card.Text>
              We are curating items that elevate your event. Please check back
              for updates.
            </Card.Text>
          </Card.Body>
        </Card>
      ) : (
        <>
          <SectionGrid
            title="Packages"
            items={packages}
            onAddToCart={handleAddToCart}
          />

          <SectionGrid
            title="Rentals"
            items={rentalsSection}
            onAddToCart={handleAddToCart}
          />
        </>
      )}
    </Container>
  );
};

export default Rentals;
