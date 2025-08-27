import React, { useState, useEffect } from "react";
import {
  Button,
  Card,
  Container,
  Row,
  Col,
  Alert,
  Carousel,
  Badge,
  Ratio,
} from "react-bootstrap";
import { collection, getDocs } from "firebase/firestore";
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

const Rentals = ({ addToCart }) => {
  const [rentals, setRentals] = useState([]);
  const [addedToCart, setAddedToCart] = useState(false);
  const [loading, setLoading] = useState(true);

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

  // Write through to localStorage for persistence
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
    setTimeout(() => setAddedToCart(false), 1000);
  };

  return (
    <Container className="py-3">
      {addedToCart ? <Alert variant="success">Added to Cart</Alert> : null}
      <div className="d-flex align-items-center justify-content-between mb-2">
        <h2 className="m-0">Rentals</h2>
        <Badge bg="secondary" pill>
          {rentals.length} items
        </Badge>
      </div>

      {loading ? (
        <p>Loading products...</p>
      ) : rentals.length === 0 ? (
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
        <Row xs={1} sm={2} md={3} xl={4} className="g-3">
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
                    <Card.Text className="text-muted" style={{ minHeight: 48 }}>
                      {item.description}
                    </Card.Text>
                  ) : (
                    <div style={{ minHeight: 48 }} />
                  )}
                  <div className="mt-auto d-grid">
                    <Button
                      variant="primary"
                      onClick={() => handleAddToCart(item)}
                    >
                      Add to Cart
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
    </Container>
  );
};

export default Rentals;
