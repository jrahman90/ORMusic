import React, { useState, useEffect } from "react";
import { Button, Container, Row, Col } from "react-bootstrap";
import { Link } from "react-router-dom";
import Pictures from "./SubElements/Pictures";
import "./Css/components.css";

export default function Home() {
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // Check localStorage if user has already seen the modal
    const hasSeenModal = localStorage.getItem("hasSeenModal");
    if (!hasSeenModal) {
      setShowModal(true);
    }
  }, []);

  const handleCloseModal = () => {
    // Mark as seen and close the modal
    localStorage.setItem("hasSeenModal", "true");
    setShowModal(false);
  };

  return (
    <div>
      {/* Glassmorphic modal for first-time visitors */}
      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <p style={styles.modalText}>
              Welcome to the updated OR Music Events website! Now, you can
              easily create a profile from the login button in the navbar and
              conveniently send inquiries through the cart.
            </p>
            <button style={styles.closeButton} onClick={handleCloseModal}>
              Close
            </button>
          </div>
        </div>
      )}

      <section className="home-hero">
        <Container className="home-hero-inner">
          <img className="home-logo" src="ormusiclogo.png" alt="OR Music Events" />
          <h1>OR Music Events</h1>
          <p>
            DJ, MC, lighting, staging, and event production for celebrations
            that need to feel alive from the first song to the last toast.
          </p>
          <div className="home-hero-actions">
            <Button as={Link} to="/RentalItems" size="lg">
              Build Your Event Package
            </Button>
            <Button as={Link} to="/contact" variant="outline-light" size="lg">
              Ask a Question
            </Button>
          </div>
        </Container>
      </section>

      <section className="home-band">
        <Container>
          <Row className="g-4 align-items-center">
            <Col lg={5}>
              <h2>Celebrate With Us</h2>
              <p>
                We produce weddings, corporate gatherings, private parties, and
                concerts across the tristate area with DJ/MC talent, lighting,
                decor, staging, photography, and video support.
              </p>
            </Col>
            <Col lg={7}>
              <div className="service-highlights">
                <div>
                  <strong>Entertainment</strong>
                  <span>DJ, MC, playlists, hosting, crowd energy</span>
                </div>
                <div>
                  <strong>Production</strong>
                  <span>Lighting, screens, stages, sound, event flow</span>
                </div>
                <div>
                  <strong>Full Packages</strong>
                  <span>Bundled services tailored to the event size</span>
                </div>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      <section className="home-services">
        <Container>
          <div className="section-heading">
            <h2>Services That Set the Room</h2>
            <Button as={Link} to="/RentalItems" variant="outline-primary">
              Browse Services
            </Button>
          </div>
          <Pictures />
        </Container>
      </section>
    </div>
  );
}

const styles = {
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  modalContent: {
    /* Glassmorphic styling */
    boxSizing: "border-box",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    backdropFilter: "blur(10px)",
    border: "1px solid rgba(255, 255, 255, 0.3)",
    borderRadius: "8px",
    padding: "2rem",
    maxWidth: "600px",
    width: "90%",
    textAlign: "center",
    boxShadow: "0 0 20px rgba(0,0,0,0.2)",
  },
  modalText: {
    marginBottom: "1.5rem",
    color: "#fff",
    fontSize: "18px",
    lineHeight: 1.5,
  },
  closeButton: {
    border: "none",
    borderRadius: "5px",
    padding: "0.5rem 1rem",
    backgroundColor: "#007bff",
    color: "white",
    cursor: "pointer",
    fontSize: "16px",
  },
};
